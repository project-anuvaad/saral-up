import React, { Component } from 'react';
import { View, ScrollView, Text, Alert, BackHandler } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import _ from 'lodash'
import AsyncStorage from '@react-native-community/async-storage';
import Strings from '../../utils/Strings';
import AppTheme from '../../utils/AppTheme';
import ScanHistoryCard from './ScanHistoryCard';
import HeaderComponent from '../common/components/HeaderComponent';
import Spinner from '../common/components/loadingIndicator';
import { apkVersionId, apkVersion } from '../../configs/config'
import { getScanData, getLoginCred, setLoginData, setScanData } from '../../utils/StorageUtils'
import APITransport from '../../flux/actions/transport/apitransport';
import { SaveScanData } from '../../flux/actions/apis/saveScanDataAction';
import { LoginAction } from '../../flux/actions/apis/LoginAction';
import { validateToken } from '../../utils/CommonUtils'

class ScanHistoryComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loginDetails: null,
            isLoading: false,
            scanData: null,
            fetchedScanStatus: [],
            onGoingData: [],
            completedData: [],
            submittedClass: '',
            dataPayload: null,
            autoLoginAttempt: 1,
            schoolId: '',
            password: '',
        }
    }

    componentDidMount() {
        const { navigation } = this.props
        navigation.addListener('willFocus', async payload => {
            BackHandler.addEventListener('hardwareBackPress', this.onBack)
            const { loginData } = this.props            
            let scanData = await getScanData()
            if (scanData) {
                this.setState({
                    scanData
                })
            }

            if(loginData && loginData.data) {
                this.setState({ loginDetails: loginData.data }, () => {
                    this.refactorData()
                })
            }

        })

        this.willBlur = navigation.addListener('willBlur', payload =>
            BackHandler.removeEventListener('hardwareBackPress', this.onBack)
        );
    }

    onBack = () => {
        this.props.navigation.navigate('selectDetails')
        return true
    }

    refactorData = () => {
        const { studentsAndSavedScanData } = this.props
        let fetchedScanData = []
        if(studentsAndSavedScanData && studentsAndSavedScanData.data && studentsAndSavedScanData.data.completedStudentsScanDetails) {
            fetchedScanData = JSON.parse(JSON.stringify(studentsAndSavedScanData.data.completedStudentsScanDetails))
        }
        this.setState({
            fetchedScanStatus: fetchedScanData
        }, () => {
            this.createCardData()
        })
    }

    filterScanData = (scanData) => {
        const { filteredData } = this.props
        let response = filteredData.response
        let scanFilterData = []
        _.forEach(scanData, (item) => {
            if(item.classId == response.class) {
                scanFilterData.push(item)
            }
        })
        return scanFilterData
    }

    createCardData = () => {
        const { scanData, fetchedScanStatus } = this.state
        const { filteredData, studentsAndSavedScanData } = this.props
        let filteredDataRsp = filteredData.response

        let completedScan = []
        let ongoingScan = []
        let status = ''
        let saveCountStatus = ''
        
        let fetchedCount = fetchedScanStatus.length;
        let studentStrength = studentsAndSavedScanData.data.studentsInfo.length
        let scanCount = 0
        let saveCount = 0
        if(scanData) {
            let scanFilterData = this.filterScanData(scanData)
            if(scanFilterData.length > 0) {
                for (let i = 0; i < fetchedScanStatus.length; i++) {
                    if (data.student.aadhaarUID == fetchedScanStatus[i].AadhaarUID) {
                        fetchedCount--;
                        break;
                    }
                }
            }
            scanCount = scanFilterData.length
            saveCount = _.filter(scanFilterData, (o) => o.save_status == 'Yes').length
            
        }
        status = scanCount + fetchedCount == studentStrength ? 'Completed' : scanCount + fetchedCount + ' of ' + studentStrength
        saveCountStatus = saveCount + fetchedCount == studentStrength ? 'Completed' : saveCount + fetchedCount + ' of ' + studentStrength

        let obj = {
            classId: filteredDataRsp.class,
            scanStatus: status,
            saveStatus: saveCountStatus
        }

        if (status == 'Completed' && saveCountStatus == 'Completed') {
            completedScan.push(obj)
        }
        else {
            ongoingScan.push(obj)
        }
        this.setState({
            onGoingData: ongoingScan,
            completedData: completedScan
        })
    }

    renderCompletedScans = () => {
        return (
            <View style={{ marginTop: '5%' }}>

                {this.state.completedData.map((data, index) =>{
                        return(
                            <ScanHistoryCard
                                key={index}
                                onPressContinue={ () => this.onIncompletedCardClick(data)}    
                                // onPressStatus={ () => this.onPressScanStatus(data)}
                                // onPressSave={ () => this.onCompletedCardClick(data)}
                                customContainerStyle={{ backgroundColor: AppTheme.GREEN, marginTop: '2%' }}
                                className={data.classId}
                                scanStatus={data.scanStatus}
                                saveStatus={data.saveStatus}
                                // scanStatusShow={true}
                                // showButtons={true}
                                showContinueBtn={true}
                            />
                        )
                })}

            </View>
        );
    }

    onCompletedCardClick = async(data) => {
        const { scanData, loginDetails } = this.state
        
        if(data.scanStatus == data.saveStatus) {
            return Alert.alert(Strings.message_text, Strings.all_scanned_data_updated)
        }

        if(scanData && loginDetails) {
            let saveDataObj = {
                "classId": data.classId,
                "schoolCode": loginDetails.schoolInfo.schoolCode
            }

            let studentsMarksArr = []
            _.forEach(scanData, (o) => {
                if(o.classId == saveDataObj.classId) {
                    let studentsObj = {
                        "studentId": o.studentId,
                        "marksInfo": o.marksInfo
                    }
                    studentsMarksArr.push(studentsObj)
                }
            })
            saveDataObj.studentInfoWithMarks = studentsMarksArr
            this.setState({
                isLoading: true,
                submittedClass: data.classId,
                dataPayload: saveDataObj
            }, () => {
                let isTokenValid = validateToken(loginDetails.expiresOn)
                if (isTokenValid) {
                    this.callSaveApi(loginDetails.jwtToken)
                }
                else if (!isTokenValid) {
                    this.setState({
                        callApi: 'callSaveApi'
                    })
                    this.loginAgain()
                }
            })
        }
        
    }

    callSaveApi = (token) => {
        const { dataPayload } = this.state
        this.setState({
            calledSaveApi: true,
        }, () => {
            let apiObj = new SaveScanData(dataPayload, token);
            this.props.APITransport(apiObj)
        })
    }

    loginAgain = () => {
        const { autoLoginAttempt } = this.state        
        this.setState({ autoLoginAttempt: autoLoginAttempt + 1 }, async() => {
            let loginCred = await getLoginCred()        
            if(loginCred) {
                this.setState({
                    isLoading: true,
                    schoolId: loginCred.schoolId,
                    password: loginCred.password
                }, () => {
                    this.callLogin()
                })
            }
            else {
                Alert.alert(Strings.message_text, autoLoginAttempt <=2 ? Strings.please_try_again : Strings.please_login_again, [
                    { 'text': Strings.ok_text, onPress: async() => {
                        if(autoLoginAttempt <=2) {
                            this.loginAgain()
                        } else {
                            await AsyncStorage.clear();
                            this.props.navigation.navigate('auth')
                        }
                    }}
                ])
            }
        })
    }

    callLogin = () => {
        const { schoolId, password } = this.state
        this.setState({
            isLoading: true,
            calledLogin: true
        }, () => {
            let loginCredObj = {
                "userName": schoolId,
                "password": password,
                "classes": true
            }
            let apiObj = new LoginAction(loginCredObj);
            this.props.APITransport(apiObj);
        })
    }
    // onPressScanStatus = (data) => {
    //     this.props.navigation.navigate('scanStatus', { scanStatusData: data })
    // }

    renderIncompletedScans = () => {
        return (
            <View style={{ marginTop: '5%', marginBottom: '5%' }}>
            {this.state.onGoingData.map((data, index) =>{
                let scanCountArr = data.scanStatus.split(' of ')
                      
                    return(
                        <ScanHistoryCard
                            key={index}
                            // onPressStatus={ () => this.onPressScanStatus(data)}
                            onPressContinue={ () => this.onIncompletedCardClick(data)}
                            onPressSave={ () => this.onCompletedCardClick(data)}
                            customContainerStyle={{ marginTop: '2%' }} 
                            className={data.classId}
                            scanStatus={data.scanStatus}
                            saveStatus={data.saveStatus}
                            showButtons={scanCountArr[0] != '0'}
                            // scanStatusShow={scanCountArr[0] != '0'}
                            showContinueBtn={true}
                        />
                    )
            })}
            </View>
        );
    }

    onIncompletedCardClick = (data) => {        
        this.props.navigation.navigate('myScan')
    }

    loader = (flag) => {
        this.setState({
            isLoading: flag
        })
    }

    async componentDidUpdate(prevProps) {
        if(prevProps != this.props) {
            const { apiStatus, loginData, savedScanData } = this.props
            const { callApi, calledLogin, calledSaveApi, submittedClass, scanData } = this.state
            if (apiStatus && prevProps.apiStatus != apiStatus && apiStatus.error) {
                if(calledSaveApi || calledLogin) {                    
                    this.loader(false)
                    this.setState({ 
                        calledSaveApi: false, 
                        calledLogin: false,
                    }, () => {
                        if(apiStatus && apiStatus.message) {
                            Alert.alert(Strings.message_text, apiStatus.message, [{
                                text: Strings.ok_text
                            }])
                        } else {
                            Alert.alert(Strings.message_text, Strings.please_try_again, [{
                                text: Strings.ok_text
                            }])
                        }
                    })
                }
            }

            if(calledLogin) {                
                if (loginData && prevProps.loginData != loginData) {
                    this.setState({
                        isLoading: false,
                        calledLogin: false
                    }, async() => {
                        if(loginData.status && loginData.status == 200) {
                                let loginSaved = await setLoginData(loginData)
                                if(loginSaved) {
                                    this.setState({ 
                                        loginDetails: loginData.data 
                                    }, () => {
                                        if (callApi == 'callSaveApi') {
                                            this.callSaveApi(loginData.data.jwtToken)
                                        }
                                    })
                                }
                                else {
                                    Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                        { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => this.loader(false) },
                                        { 'text': Strings.retry_text, onPress: () => this.callLogin() }
                        
                                    ])
                                }
                        }
                        else {
                            Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => this.loader(false) },
                                { 'text': Strings.retry_text, onPress: () => this.callLogin() }
                
                            ])
                        }
                    })
                }
            }

            if(calledSaveApi) {
                if(savedScanData && prevProps.savedScanData != savedScanData) {
                    this.setState({
                        calledSaveApi: false, callApi: '', isLoading: false
                    }, async () => {
                        if(savedScanData.status && savedScanData.status == 200) {
                            if (scanData) {
                                let scanDataCopy = JSON.parse(JSON.stringify(scanData))
                                for (let i = 0; i < scanDataCopy.length; i++) {
                                    if (submittedClass == scanDataCopy[i].classId) {
                                        scanDataCopy[i].save_status = 'Yes'
                                    }
                                }
                                let savedScan = await setScanData(scanDataCopy)
                                if (savedScan) {
                                    this.setState({
                                        scanData: scanDataCopy
                                    }, () => {
                                        Alert.alert(Strings.message_text, Strings.saved_successfully, [{
                                            text: Strings.ok_text, onPress: () => { this.createCardData() }
                                        }])
                                    })
                                }
                                else {
                                    Alert.alert(Strings.message_text, Strings.please_try_again, [{
                                        text: Strings.ok_text
                                    }])
                                }
                            }
                        }
                        else {
                            Alert.alert(Strings.message_text, Strings.please_try_again, [{
                                text: Strings.ok_text
                            }])
                        }
                    })
                }
            }
        }
    }

    render() {
        const { onGoingData, completedData, loginDetails, isLoading } = this.state        
        return (

            <View style={{ flex: 1 }}>
                <HeaderComponent
                    title={Strings.up_saralData}
                    versionText={apkVersion}
                />
                {(loginDetails && loginDetails.schoolInfo) && 
                <Text 
                    style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, color: AppTheme.BLACK, fontWeight: 'bold',  paddingHorizontal: '5%', paddingVertical: '2%' }}
                >
                    {Strings.school_name+' : '}
                    <Text style={{ fontWeight: 'normal'}}>
                        {loginDetails.schoolInfo.school}
                    </Text>
                </Text>}
                {(loginDetails && loginDetails.schoolInfo) && 
                <Text 
                    style={{ fontSize: AppTheme.FONT_SIZE_REGULAR-3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%', marginBottom: '2%' }}
                >
                    {Strings.schoolId_text+' : '}
                    <Text style={{ fontWeight: 'normal'}}>
                        {loginDetails.schoolInfo.schoolCode}
                    </Text>
                </Text>}
                <ScrollView
                    contentContainerStyle={{ paddingTop: '2%', paddingBottom: '35%' }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps={'handled'}
                >
                    {completedData && completedData.length > 0 &&
                    <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {Strings.completed_scan}
                        </Text>
                        {this.renderCompletedScans()}
                    </View>}
                    {onGoingData && onGoingData.length > 0 &&
                    <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {Strings.ongoing_scan}
                        </Text>
                        {this.renderIncompletedScans()}
                    </View>}
                    {onGoingData.length == 0 && completedData.length == 0 &&
                    <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {Strings.no_scan_data_available}
                        </Text>
                    </View>}
                   
                </ScrollView>
                {isLoading && <Spinner animating={isLoading} />}
            </View>
        );
    }
}

const styles = {
    container1: {
        flex: 1,
        marginHorizontal: '4%',
        alignItems: 'center',
        paddingVertical: '5%'
    },
    header1TextStyle: {
        backgroundColor: AppTheme.LIGHT_BLUE,
        lineHeight: 40,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: AppTheme.LIGHT_GREY,
        width: '100%',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: AppTheme.FONT_SIZE_SMALL,
        color: AppTheme.BLACK,
        letterSpacing: 1
    }
}

const mapStateToProps = (state) => {
    return {
        apiStatus: state.apiStatus,
        loginData: state.loginData,
        filteredData: state.filteredData,
        studentsAndSavedScanData: state.studentsAndSavedScanData,
        savedScanData: state.savedScanData
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        APITransport: APITransport,
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(ScanHistoryComponent));
