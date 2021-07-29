import React, { Component } from 'react';
import { View, ScrollView, Text, BackHandler, Alert, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import AsyncStorage from '@react-native-community/async-storage';
import _ from 'lodash'
import DateTimePicker from '@react-native-community/datetimepicker'
import Strings from '../../utils/Strings';
import AppTheme from '../../utils/AppTheme';
import Spinner from '../common/components/loadingIndicator';
import { apkVersion } from '../../configs/config';
import HeaderComponent from '../common/components/HeaderComponent';
import DropDownMenu from '../common/components/DropDownComponent';
import TextField from '../common/components/TextField';
import ButtonComponent from '../common/components/ButtonComponent';
import { setStudentsAndSavedScanData, getStudentsAndSavedScanData, getLoginCred, setLoginData } from '../../utils/StorageUtils'
import { GetStudentsAndSavedScanData } from '../../flux/actions/apis/getStudentsAndSavedScanData';
import { FilteredDataAction } from '../../flux/actions/apis/filteredDataActions';
import APITransport from '../../flux/actions/transport/apitransport';
import { validateToken } from '../../utils/CommonUtils'
import { LoginAction } from '../../flux/actions/apis/LoginAction';
import { LocalStudentsAndSavedScanData } from '../../flux/actions/apis/LocalStudentsAndSavedData';


const clearState = {
    defaultSelected: Strings.select_text,
    classesArr: [],
    classList: [],
    classListIndex: -1,
    selectedClass: '',
    pickerDate: new Date(),
    selectedDate: '',
    classValid: false,
    errClass: '',
    errDate: '',
    selectedClassId: '',
    calledStudentsData: false,
    schoolId: '',
    password: '',
    dataPayload: null,
    calledLogin: false,
    callApi: '',
    dateVisible: false,
    autoLoginAttempt: 1,
    studentsAndSavedData: null
}

class SelectDetailsComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            loginDetails: null,
            defaultSelected: Strings.select_text,
            classesArr: [],
            classList: [],
            classListIndex: -1,
            selectedClass: '',
            pickerDate: new Date(),
            selectedDate: '',
            classValid: false,
            errClass: '',
            errDate: '',
            selectedClassId: '',
            calledStudentsData: false,
            schoolId: '',
            password: '',
            dataPayload: null,
            calledLogin: false,
            callApi: '',
            dateVisible: false,
            autoLoginAttempt: 1,
            studentsAndSavedData: null
        }
        this.onBack = this.onBack.bind(this)
    }

    componentDidMount() {
        const { navigation } = this.props

        navigation.addListener('willFocus', async payload => {
            const { loginData } = this.props
            BackHandler.addEventListener('hardwareBackPress', this.onBack)

            this.setState(clearState)
            
            if(loginData && loginData.data) {
                let loginRes = loginData.data
                let classesArr = [...loginRes.classInfo]
                let classes = []
                _.forEach(classesArr, (data, index) => {
                    classes.push(data.className)
                })                  
                
                 this.setState({
                     classList: classes,
                     classesArr: classesArr,
                     loginDetails: loginRes
                 })
            }
            let studentsAndSavedScanArr = await getStudentsAndSavedScanData()
            if(studentsAndSavedScanArr) {
                this.setState({ studentsAndSavedData:  studentsAndSavedScanArr })
            }
        })
        this.willBlur = navigation.addListener('willBlur', payload =>
            BackHandler.removeEventListener('hardwareBackPress', this.onBack)
        );
    }

    onBack = () => {
        BackHandler.exitApp()
        return true
    }

    onLogoutClick = async () => {
        Alert.alert(Strings.message_text, Strings.are_you_sure_you_want_to_logout, [
            { 'text': Strings.no_text, style: 'cancel' },
            {
                'text': Strings.yes_text, onPress: async () => {
                    await AsyncStorage.clear();
                    this.props.navigation.navigate('auth')
                }
            }
        ])
    }

    loader = (flag) => {
        this.setState({
            isLoading: flag
        })
    }

    onDropDownSelect = (index, value, type) => {
        const { loginDetails, classesArr, selectedClass, studentsAndSavedData } = this.state
        if(type == 'class') {
            if(value != selectedClass) {
                this.setState({
                    selectedDate: '',
                    pickerDate: new Date()
                }, () => {
                    let isStudentsDataLocallyAvailable = false                    
                    if(studentsAndSavedData) {
                        let finalStudentsAndSavedScanArr = JSON.parse(JSON.stringify(studentsAndSavedData))
                        finalStudentsAndSavedScanArr.forEach((data) => {                            
                            if(data && data.classId == classesArr[index].classId) {
                                isStudentsDataLocallyAvailable = true
                                this.props.LocalStudentsAndSavedScanData(data)
                            }
                        })
                    }
                    if(isStudentsDataLocallyAvailable) {
                        this.setState({
                            errSection: '',
                            classValid: true
                        })
                    } 
                    else if(loginDetails) {                        
                        let payload = {
                            schoolCode: loginDetails.schoolInfo.schoolCode,
                            classId: classesArr[index].classId
                        }
                        this.loader(true)
                        this.setState({
                            dataPayload: payload
                        }, () => {
                            let isTokenValid = validateToken(loginDetails.expiresOn)                                 
                            if(isTokenValid) {
                                this.callStudentsData(loginDetails.jwtToken)
                            }
                            else if(!isTokenValid) {
                                this.setState({
                                    callApi: 'callStudentsData'
                                }, () => this.loginAgain())
                            }
                        })
                    }
                })
            }
            this.setState({
                errClass: '',
                errDate: '',
                classListIndex: Number(index),
                selectedClass: value,
                selectedClassId: classesArr[index].classId
            })
        }
    }

    callStudentsData = (token) => {        
        const { dataPayload } = this.state
        this.setState({
            calledStudentsData: true,
        }, () => {
            let apiObj = new GetStudentsAndSavedScanData(dataPayload, token);
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

    async componentDidUpdate(prevProps) {
        if(prevProps != this.props) {
            const { apiStatus, studentsAndSavedScanData, loginData } = this.props
            const { callApi, calledLogin, calledStudentsData, selectedClass, selectedClassId } = this.state
            if (apiStatus && prevProps.apiStatus != apiStatus && apiStatus.error) {
                if(calledStudentsData || calledLogin) {                    
                    this.loader(false)
                    this.setState({ 
                        calledStudentsData: false, 
                        calledLogin: false,
                        classValid: false,
                        selectedDate: '',
                        pickerDate: new Date()
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
                                        if (callApi == 'callStudentsData') {
                                            this.callStudentsData(loginData.data.jwtToken)
                                        }
                                    })
                                }
                                else {
                                    Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                        { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => loader(false) },
                                        { 'text': Strings.retry_text, onPress: () => this.callLogin() }
                        
                                    ])
                                }
                        }
                        else {
                            Alert.alert(Strings.message_text, Strings.process_failed_try_again, [
                                { 'text': Strings.cancel_text, style: Strings.cancel_text, onPress: () => loader(false) },
                                { 'text': Strings.retry_text, onPress: () => this.callLogin() }
                
                            ])
                        }
                    })
                }
            }

            if(calledStudentsData) {
                if(studentsAndSavedScanData && prevProps.studentsAndSavedScanData != studentsAndSavedScanData) {
                    this.loader(false)
                    this.setState({
                        calledStudentsData: false, callApi: ''
                    }, async () => {
                        if(studentsAndSavedScanData.status && studentsAndSavedScanData.status == 200) {
                            if(studentsAndSavedScanData.data.studentsInfo && studentsAndSavedScanData.data.studentsInfo.length > 0) {
                                let obj = {
                                    class: selectedClass,
                                    classId: selectedClassId,
                                    data: studentsAndSavedScanData.data
                                }
                                
                                let studentsAndSavedScanArr = await getStudentsAndSavedScanData()
                                let finalStudentsAndSavedScanArr = []
                                
                                if (studentsAndSavedScanArr != null) {
                                    finalStudentsAndSavedScanArr = JSON.parse(JSON.stringify(studentsAndSavedScanArr))
                                }
                                finalStudentsAndSavedScanArr.forEach((data, index) => {
                                    if(data && data.classId == obj.class) {
                                        finalStudentsAndSavedScanArr.splice(index, 1)
                                    }
                                })
                                finalStudentsAndSavedScanArr.push(obj)                                
                                let studentsExamDataSaved = await setStudentsAndSavedScanData(finalStudentsAndSavedScanArr)
                                if(studentsExamDataSaved) {                                    
                                    this.setState({
                                        studentsAndSavedData: finalStudentsAndSavedScanArr,
                                        errSection: '',
                                        classValid: true
                                    })
                                }
                            }
                            else {
                                this.setState({
                                    errClass: Strings.please_select_valid_class,
                                    classValid: false,
                                    selectedDate: '',
                                    pickerDate: new Date()
                                })
                            }
                            
                        }
                        else {
                            this.setState({
                                errClass: Strings.process_failed_try_again,
                                classValid: false,
                                selectedDate: '',
                                pickerDate: new Date()
                            })
                        }
                    })
                }
            }
        }
    }

    validateFields = () => {
        const { classListIndex, classValid, selectedDate } = this.state
        if(classListIndex == -1) {
            this.setState({
                errClass: Strings.please_select_class,
                errDate: ''
            })
            return false
        }
        else if(!classValid) {
            this.setState({
                errClass: '',
                errSection: Strings.please_select_valid_section,
                errSub: '',
                errDate: ''
            })
            return false
        }
        else if(selectedDate.length == 0) {
            this.setState({
                errClass: '',
                errSection: '',
                errSub: '',
                errDate: Strings.please_select_date
            })
            return false
        }
        return true
    }

    onSubmitClick = () => {
        const { selectedClass, selectedClassId, selectedDate } = this.state
        this.setState({
            errClass: '',
            errSub: '',
            errSection: '',
            errSub: ''
        }, () => {
            let valid = this.validateFields()
            if(valid) {
                let obj = {
                    className: selectedClass,
                    class: selectedClassId,
                    examDate: selectedDate,
                }
                this.props.FilteredDataAction(obj)
                this.props.navigation.navigate('scanHistory')
            }
        })
    }

    setDate = date => {
        var dateData = new Date(date)
        this.setState({
          minimumDate: dateData
        })
        let monthData = dateData.getMonth() + 1
        let currentDate =
          dateData.getDate().toString().length < 2
            ? '0' + dateData.getDate()
            : dateData.getDate()
        let month =
          String(monthData).length < 2 ? '0' + monthData : monthData
        let year = dateData.getFullYear()
    
        this.setState({
          selectedDate: year + '-' + month + '-' + currentDate,
          pickerDate: date,
          dateVisible: false
        })    
      }

    onDateChange = (event, date) => {
        if(event.type == 'set') {
            const currentDate = date || this.state.pickerDate;
            this.setDate(currentDate);
        }
        else {
            this.setState({ dateVisible: false })
        }
    }

    render() {
        const { isLoading, defaultSelected, classList, classListIndex, selectedClass, classValid, pickerDate, selectedDate, errClass, errDate, dateVisible, loginDetails } = this.state

        return (

            <View style={{ flex: 1, backgroundColor: AppTheme.WHITE_OPACITY }}>
                <HeaderComponent
                    title={Strings.up_saralData}
                    logoutHeaderText={Strings.logout_text}
                    customLogoutTextStyle={{ color: AppTheme.GREY }}
                    onLogoutClick={this.onLogoutClick}
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
                    <Text 
                        style={{ fontSize: AppTheme.FONT_SIZE_REGULAR-3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%', marginBottom: '4%' }}
                    >
                        {Strings.version_text+': '}
                        <Text style={{ fontWeight: 'normal'}}>
                            {apkVersion}
                        </Text>
                    </Text>
                <ScrollView
                    contentContainerStyle={{  paddingTop: '5%', paddingBottom: '35%' }}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    keyboardShouldPersistTaps={'handled'}
                >
                    <View style={styles.container1}>
                        <Text style={styles.header1TextStyle}>
                            {Strings.please_select_below_details}
                        </Text>
                        <View style={{ backgroundColor: 'white', paddingHorizontal: '5%', minWidth: '100%', paddingVertical: '10%', borderRadius: 4 }}>
                            <View style={[styles.fieldContainerStyle, { paddingBottom: classListIndex != -1 && classValid ? 0 : '10%'}]}>
                                <View style={{ flexDirection: 'row' }}>
                                    <Text style={[styles.labelTextStyle]}>{Strings.class_text}</Text>
                                    {errClass != '' && <Text style={[styles.labelTextStyle, { color: AppTheme.ERROR_RED, fontSize: AppTheme.FONT_SIZE_TINY + 1, width: '60%', textAlign: 'right', fontWeight: 'normal' }]}>{errClass}</Text>}
                                </View>
                                <DropDownMenu
                                    options={classList && classList}
                                    onSelect={(idx, value) => this.onDropDownSelect(idx, value, 'class')}
                                    defaultData={defaultSelected}
                                    defaultIndex={classListIndex}
                                    selectedData={selectedClass}
                                    icon={require('../../assets/images/arrow_down.png')}
                                />
                            </View>
                            {((classListIndex != -1 && classValid)) &&
                            <TouchableOpacity
                                onPress={() => this.setState({ dateVisible: true })}
                                style={styles.fieldContainerStyle}
                            >
                                <TextField
                                    customContainerStyle={{ marginHorizontal: 0, paddingBottom: '10%', paddingVertical: '0%',}}
                                    labelText={Strings.exam_date}
                                    errorField={errDate != ''}
                                    errorText={errDate}
                                    value={selectedDate}
                                    editable={false}
                                    placeholder={Strings.please_select_date}
                                />
                            </TouchableOpacity>}
                            <ButtonComponent
                                customBtnStyle={styles.nxtBtnStyle}
                                btnText={Strings.submit_text}
                                onPress={this.onSubmitClick}
                            />
                        </View>
                    </View>
                </ScrollView>
                {dateVisible && (
                    <DateTimePicker
                        display="default"
                        maximumDate={new Date()}
                        value={pickerDate}
                        mode={'date'}
                        onChange={(e, selectedDate) =>this.onDateChange(e, selectedDate)}
                    />
                )}
                {isLoading && <Spinner animating={isLoading} />}
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
        // backgroundColor: AppTheme.WHITE_OPACITY,
        lineHeight: 40,
        borderRadius: 4,
        // borderWidth: 1,
        borderColor: AppTheme.LIGHT_GREY,
        width: '100%',
        textAlign: 'center',
        fontSize: AppTheme.FONT_SIZE_SMALL+2,
        color: AppTheme.BLACK,
        letterSpacing: 1,
        marginBottom: '5%'
    },
    fieldContainerStyle: {
        paddingVertical: '2.5%'
    },
    labelTextStyle: {
        width: '40%',
        fontSize: AppTheme.FONT_SIZE_MEDIUM,
        color: AppTheme.BLACK,
        fontWeight: 'bold',
        letterSpacing: 1,
        lineHeight: 35
    },
    nxtBtnStyle: {
        marginHorizontal: '10%',
    }
}

const mapStateToProps = (state) => {
    return {
        apiStatus: state.apiStatus,
        loginData: state.loginData,
        studentsAndSavedScanData: state.studentsAndSavedScanData,
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        APITransport: APITransport,
        FilteredDataAction: FilteredDataAction,
        LocalStudentsAndSavedScanData: LocalStudentsAndSavedScanData
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(SelectDetailsComponent));