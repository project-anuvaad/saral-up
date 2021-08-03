import React, { Component } from 'react';
import { View, ScrollView, Text, Image, TouchableOpacity, Platform, PermissionsAndroid, Alert, BackHandler } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { StackActions, NavigationActions } from 'react-navigation';
import SystemSetting from 'react-native-system-setting'
import _ from 'lodash'
import RNOpenCvCameraModel from '../../utils/RNOpenCvCamera';
import Strings from '../../utils/Strings';
import AppTheme from '../../utils/AppTheme';
import Spinner from '../common/components/loadingIndicator';
import { OcrLocalResponseAction } from '../../flux/actions/apis/OcrLocalResponseAction'
import { apkVersion } from '../../configs/config';
import HeaderComponent from '../common/components/HeaderComponent';
import ButtonComponent from '../common/components/ButtonComponent';
import { getScanData } from '../../utils/StorageUtils'
import ScanHistoryCard from './ScanHistoryCard';

class MyScanComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showFooter: true,
            oldBrightness: null,
            activityOpen: false,
            isLoading: false,
            onGoingData: [],
            fetchedScanStatus: [],
            scanData: null
        }
        this.onBack = this.onBack.bind(this)
    }

    componentDidMount() {
        const { navigation } = this.props
        const { params } = navigation.state
        navigation.addListener('willFocus', async payload => {
            BackHandler.addEventListener('hardwareBackPress', this.onBack)
            if (params && params.from_screen && params.from_screen == 'scanDetails') {
                this.setState({
                    showFooter: false
                }, () => this.onScanClick())
                
            }
            else {
                let scanData = await getScanData()
                if (scanData) {
                    this.setState({
                        scanData,
                    })
                }
                this.setState({
                    showFooter: true
                }, () => this.refactorData())
            }
        })
        this.willBlur = navigation.addListener('willBlur', payload =>
            BackHandler.removeEventListener('hardwareBackPress', this.onBack)
        );
    }

    onBack = () => {
        if (this.state.activityOpen) {
            this.setState({
                showFooter: true,
                activityOpen: false
            })
            SystemSetting.setBrightnessForce(this.state.oldBrightness).then((success) => {
                if (success) {
                    SystemSetting.saveBrightness();
                }
            })
            RNOpenCvCameraModel.cancelActivity().then(data => {
                if (data) {
                    const resetAction = StackActions.reset({
                        index: 0,
                        actions: [NavigationActions.navigate({ routeName: 'myScan', params: { from_screen: 'cameraActivity' } })],
                    });
                    this.props.navigation.dispatch(resetAction);
                    return true
                }
            })
            return true
        }
        else {
            const { navigation } = this.props
            const { params } = navigation.state            
            if (params && params.from_screen && params.from_screen == 'cameraActivity') {
                this.props.navigation.navigate('scanHistory', { from_screen: 'cameraActivity' })
                return true
            }
        }
    }    

    onScanClick = async () => {
        SystemSetting.getBrightness().then((brightness) => {
            this.setState({ oldBrightness: brightness })
        });

        if (Platform.OS !== 'ios') {
            const grantedRead = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE)
            const grantedWrite = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)
            const grantedCamera = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)
            
            if (grantedRead && grantedWrite && grantedCamera) {
                this.openCameraActivity()
            }
            else {
                PermissionsAndroid.requestMultiple(
                    [
                        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                        PermissionsAndroid.PERMISSIONS.CAMERA
                    ],
                    {
                        title: Strings.permission_text,
                        message: Strings.app_needs_permission
                    }
                ).then((permRes) => {
                    if (
                        permRes['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
                        permRes['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
                        permRes['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED
                    ) {
                        this.openCameraActivity()
                    } else if(permRes['android.permission.READ_EXTERNAL_STORAGE'] == 'never_ask_again' ||
                        permRes['android.permission.WRITE_EXTERNAL_STORAGE'] == 'never_ask_again' ||
                        permRes['android.permission.CAMERA'] == 'never_ask_again') {
                        Alert.alert(Strings.message_text, Strings.give_permission_from_settings, [
                            { 'text': Strings.ok_text, style: 'cancel' }
                        ]);
                    } else {
                        Alert.alert(Strings.message_text, Strings.please_give_permission_to_use_app, [
                            { 'text': Strings.cancel_text, style: 'cancel' },
                            { 'text': Strings.ok_text, onPress: () => this.onScanClick() }

                        ]);
                    }
                });
            }
        }
    }

    lastFourDigit = (data) => {
        let digit = data.toString().substring(data.toString().length - 4)
        return digit;
    }
    
    openCameraActivity = () => {
        const { studentsAndSavedScanData } = this.props
        SystemSetting.setBrightnessForce(1).then(async (success) => {
            if (success) {
                SystemSetting.saveBrightness();
                this.setState({
                    activityOpen: true
                })
                let studentList = studentsAndSavedScanData.data.studentsInfo
                var self = this;
                let students7DigitRollList = []
                studentList.forEach(element => {
                    let last4Digit = self.lastFourDigit(element.studentId)
                    students7DigitRollList.push(last4Digit)
                })
                let uniqStudentsList = _.uniq(students7DigitRollList);
                RNOpenCvCameraModel.openScanCamera(JSON.stringify(uniqStudentsList))
                    .then(data => {
                        console.log("imgArrSuccess", JSON.parse(data));
                        let scannerResponse = JSON.parse(data)
                        this.props.OcrLocalResponseAction(scannerResponse)
                        this.setState({ isLoading: false })
                        this.props.navigation.navigate('patScanDetails', { oldBrightness: this.state.oldBrightness })
                    })
                    .catch((code, errorMessage) => {
                        this.setState({ isLoading: false })
                        Alert.alert(Strings.message_text, Strings.table_image_is_not_proper)
                        console.log("dataFailure", code, "Message", errorMessage);
                    });
                }
            else if (!success) {
                Alert.alert(Strings.permission_deny, Strings.you_have_no_permission_to_change_settings, [
                    { 'text': Strings.ok_text, style: Strings.cancel_text },
                    { 'text': Strings.open_settings, onPress: () => SystemSetting.grantWriteSettingPremission() }
                ])
            }
        });
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
            className: filteredDataRsp.class,
            scanStatus: status,
            saveStatus: saveCountStatus
        }

        ongoingScan.push(obj)
        this.setState({
            onGoingData: ongoingScan,
        })
    }

    onDashboardClick = () => {
        const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: 'selectDetails'})],
        });
        this.props.navigation.dispatch(resetAction);
    }

    renderIncompletedScans = () => {
        return (
            <View style={{ marginTop: '5%', marginBottom: '5%' }}>
                {this.state.onGoingData.map((data, index) => {
                    return (
                        <ScanHistoryCard
                            key={index}
                            customContainerStyle={{ marginTop: '2%' }}
                            className={data.className}
                            scanStatus={data.scanStatus}
                            saveStatus={data.saveStatus}
                            showButtons={false}
                        />
                    )
                })}
            </View>
        );
    }

    render() {
        const { isLoading, onGoingData } = this.state;
        const { loginData } = this.props
        
        return (

            <View style={{ flex: 1, backgroundColor: AppTheme.WHITE_OPACITY }}>
                <HeaderComponent
                    title={Strings.up_saralData}
                    versionText={apkVersion}
                />
                {(loginData.data && loginData.data.schoolInfo) && 
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, color: AppTheme.BLACK, fontWeight: 'bold',  paddingHorizontal: '5%', paddingVertical: '2%' }}
                    >
                        {Strings.school_name+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {loginData.data.schoolInfo.school}
                        </Text>
                    </Text>}
                    {(loginData.data && loginData.data.schoolInfo) && 
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR-3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%', marginBottom: '2%' }}
                    >
                        {Strings.schoolId_text+' : '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {loginData.data.schoolInfo.schoolCode}
                        </Text>
                    </Text>}
                <ScrollView
                    contentContainerStyle={{  paddingTop: '5%', paddingBottom: '35%' }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps={'handled'}
                >

                    {onGoingData && onGoingData.length > 0 &&
                        <View style={styles.container1}>
                            <Text style={styles.header1TextStyle}>
                                {Strings.current_scan}
                            </Text>
                            {this.renderIncompletedScans()}
                            <View style={{ marginTop: '8%' }}>
                                <ButtonComponent
                                    customBtnStyle={styles.nxtBtnStyle}
                                    btnText={Strings.go_to_dashboard}
                                    onPress={this.onDashboardClick}
                                />
                            </View>
                        </View>}
                </ScrollView>
                <View style={styles.bottomTabStyle}>
                </View>

                <View style={[styles.bottomTabStyle, { height: 135, width: '50%', marginHorizontal: '25%', backgroundColor: 'transparent', justifyContent: 'center' }]}>
                    <TouchableOpacity style={[styles.subTabContainerStyle]}
                        onPress={this.onScanClick}
                    >
                        <TouchableOpacity 
                            style={[styles.scanTabContainerStyle,]}
                        >
                            <TouchableOpacity
                                style={styles.scanSubTabContainerStyle}
                            >
                                <Image
                                    source={require('../../assets/images/scanIcon.png')}
                                    style={styles.tabIconStyle}
                                    resizeMode={'contain'}
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <Text style={[styles.tabLabelStyle, { paddingTop: '71%' }]}>
                            {Strings.scan_text}
                        </Text>
                    </TouchableOpacity>
                </View>
                {isLoading &&
                    <Spinner
                        animating={isLoading}
                        customContainer={{ opacity: 0.9, elevation: 15 }}
                    />}
            </View>
        );
    }
}

const styles = {
    container1: {
        flex: 1,
        marginHorizontal: '6%',
        alignItems: 'center'
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
    },
    bottomTabStyle: {
        position: 'absolute',
        flexDirection: 'row',
        bottom: 0,
        height: 90,
        left: 0,
        right: 0,
        backgroundColor: AppTheme.WHITE,
        elevation: 10,
        paddingLeft: '5%',
        paddingRight: '5%',
        justifyContent: 'space-between'
    },
    subTabContainerStyle: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabIconStyle: {
        width: 40,
        height: 40
    },
    tabLabelStyle: {
        lineHeight: 40,
        textAlign: 'center',
        fontSize: AppTheme.FONT_SIZE_SMALL,
        color: AppTheme.BLACK,
        letterSpacing: 1,
        fontWeight: 'bold'
    },
    scanTabContainerStyle: {
        width: 85,
        height: 85,
        backgroundColor: AppTheme.WHITE,
        position: 'absolute',
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center'
    },
    scanSubTabContainerStyle: {
        width: '90%',
        height: '90%',
        backgroundColor: AppTheme.BLUE,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center'
    },
    nxtBtnStyle: {
        padding: 10
    },
}

const mapStateToProps = (state) => {
    return {
        loginData: state.loginData,
        filteredData: state.filteredData,
        studentsAndSavedScanData: state.studentsAndSavedScanData,
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        OcrLocalResponseAction: OcrLocalResponseAction,
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(MyScanComponent));