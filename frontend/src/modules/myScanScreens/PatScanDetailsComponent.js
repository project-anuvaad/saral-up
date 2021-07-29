import React, { Component } from 'react';
import { View, ScrollView, Text, Alert, BackHandler } from 'react-native';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { StackActions, NavigationActions } from 'react-navigation';
import SystemSetting from 'react-native-system-setting'
import _ from 'lodash'
import Strings from '../../utils/Strings';
import AppTheme from '../../utils/AppTheme';
import { apkVersion } from '../../configs/config'
import HeaderComponent from '../common/components/HeaderComponent';
import Spinner from '../common/components/loadingIndicator';
import ButtonComponent from '../common/components/ButtonComponent';
import ButtonWithIcon from '../common/components/ButtonWithIcon';
import NumeracyScanCard from './NumeracyScanCard';
import StudentsSummaryCard from './StudentsSummaryCard';
import APITransport from '../../flux/actions/transport/apitransport';
import { getScanData, setScanData } from '../../utils/StorageUtils'
import PopupDialog from './PopupDialog';

class PatScanDetailsComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            oldBrightness: null,
            isLoading: false,
            studentClass: '1',
            examDate: '',
            studentsScanData: [],
            summary: false,
            calledSavedData: false,
            saveData: {},
            popupVisible: false,
            popupData: [],
            defaultSelectedStuName: Strings.select_student_name
        }
        this.onBack = this.onBack.bind(this)
    }

    componentDidMount() {
        const { navigation, ocrLocalResponse } = this.props
        navigation.addListener('willFocus', payload => {
            BackHandler.addEventListener('hardwareBackPress', this.onBack)
            const { params } = navigation.state
            if (params && params.oldBrightness) {
                SystemSetting.setBrightnessForce(params.oldBrightness).then((success) => {
                    if (success) {
                        SystemSetting.saveBrightness();
                    }
                })
            }

            if (ocrLocalResponse && ocrLocalResponse.response) {

                const data = ocrLocalResponse.response;
                this.processData(data)
            }
        })
        this.willBlur = navigation.addListener('willBlur', payload =>
            BackHandler.removeEventListener('hardwareBackPress', this.onBack)
        );
    }

    onBack = async () => {
        const { summary } = this.state
        if(summary) {
            this.setState({ summary: false })
            return true
        } else if(!summary) {
            const resetAction = StackActions.reset({
                index: 0,
                actions: [NavigationActions.navigate({ routeName: 'myScan', params: { from_screen: 'scanDetails' } })],
            });
            this.props.navigation.dispatch(resetAction);
            return true
        }
        return false
    }

    processData = (data) => {
        const { filteredData, loginData, studentsAndSavedScanData } = this.props
        let filteredDataResponse = filteredData.response
        let selectedClass = filteredDataResponse.class
        let examDate = filteredDataResponse.examDate
        let students = data.students
        let studentsArr = []
        students.forEach((studentsData, index) => {
            let obj = {
                rollNumber: studentsData.srn,
                stdErr: ''
            }
            let marksArr = []
            let marks = []
            let sortedMarks = _.sortBy(studentsData.marks, ['question'])
            sortedMarks.forEach((marksData, marksIndex) => {
                let marksObj = {}
                let marksDataObj = {}
                marksDataObj.mark = marksData.mark.length > 0 ? parseInt(marksData.mark) : marksData.mark
                marksDataObj.question = String(marksData.question)
                if(loginData && loginData.data && loginData.data.storeTrainingData) {
                    marksDataObj.base64 = marksData.base64
                }
                marks.push(marksDataObj)

                if (marksIndex == 4) {
                    marksObj.levelText = 'HINDI'
                    marksObj.marks = marks.slice(0, 5)
                    marksArr.push(marksObj)
                }
                if (marksIndex == 9) {
                    marksObj.levelText = 'MATH'
                    marksObj.marks = marks.slice(5, 10)
                    marksArr.push(marksObj)
                }
            });
            obj.marksData = marksArr
            studentsArr.push(obj)
        });

        if (studentsArr.length == 0) {
            setTimeout(() => {
                Alert.alert(Strings.message_text, Strings.table_image_is_not_proper, [{
                    text: Strings.ok_text, onPress: () => this.onBack()
                }])
            }, 200);
            return
        }
        // to check if scan students count is more than available students
        let studentList = studentsAndSavedScanData.data.studentsInfo
        if(studentsArr.length > studentList.length) {
            studentsArr.splice(studentList.length, studentsArr.length)
        }
        this.setState({
            studentsScanData: studentsArr,
            studentClass: selectedClass,
            examDate
        }, () => {
            this.validateStudentIds(studentsArr, true)
        })
    }

    lastFourDigit = (data) => {
        let digit = data.toString().substring(data.toString().length - 4)
        return digit;
    }

    validateStudentIds = (data, showPopup, validatationIndex = -1) => {               
        const { studentsAndSavedScanData } = this.props
        let studentList = studentsAndSavedScanData.data.studentsInfo
        let studentsIdsData = []
        var self = this;
        if(validatationIndex == -1) {
            _.forEach(data, (o) => {
                let filteredList =  _.filter(studentList, (element) => {
                     let last4Digit = self.lastFourDigit(element.studentId)                
                     return last4Digit == o.rollNumber 
                 })
                 studentsIdsData.push(filteredList)
             })
        } 
        else if(validatationIndex != -1) {
            let filteredList = _.filter(studentList, (element) => {
                let last4Digit = self.lastFourDigit(element.studentId)
                return last4Digit == data[validatationIndex].rollNumber
            })
            studentsIdsData.push(filteredList)
        }
        
        let studentsScanData = JSON.parse(JSON.stringify(data))
        let createPopupData = []
        _.forEach(studentsIdsData, (o, index) => {
            let selectedIndex = validatationIndex == -1 ? index : validatationIndex
            if(o.length == 1) {
                studentsScanData[selectedIndex].stdErr = ''
                studentsScanData[selectedIndex].studentObj = o[0]
            }
            else if(o.length > 1) {
                let studentIdArr = []
                _.forEach(o, (ele) => {
                    studentIdArr.push(ele.studentId)
                })
                let obj = {
                    index: selectedIndex,
                    studentsData: o,
                    selectedStuIndex: -1,
                    selectedStuName: '',
                    studentIdArr 
                }
                createPopupData.push(obj)
            } 
            else if(o.length == 0) {
                studentsScanData[selectedIndex].stdErr = Strings.srn_not_valid
                studentsScanData[selectedIndex].studentObj = null
            }
        })

        this.setState({
            studentsScanData
        }, () => {        
            if(showPopup && createPopupData.length> 0) {
                this.setState({
                    popupVisible: true,
                    popupData: createPopupData
                })
            }
        })
    }

    onDropDownSelect = (selectedIndex, value, arrIndex) => {
        const { studentsScanData, popupData } = this.state

        let stuArr = JSON.parse(JSON.stringify(popupData))
        let studentsScanArr = JSON.parse(JSON.stringify(studentsScanData))
        if(stuArr[arrIndex].selectedStuIndex != selectedIndex){
            studentsScanArr[stuArr[arrIndex].index].studentObj = stuArr[arrIndex].studentsData[selectedIndex]
            studentsScanArr[stuArr[arrIndex].index].stdErr = ''
        }
        stuArr[arrIndex].selectedStuIndex = selectedIndex
        stuArr[arrIndex].selectedStuName = value
        this.setState({
            popupData: stuArr,
            studentsScanData: studentsScanArr
        }) 
    }

    onDropDownSubmitClick = () => {
        const { popupData } =  this.state
        let checkAllSelected = true
        
        for(let i = 0; i<popupData.length; i++) {
            if(popupData[i].selectedStuIndex == -1) {
                checkAllSelected = false
            }
        }


        if(checkAllSelected) {
            this.setState({
                popupVisible: false
            })
        } else {
            Alert.alert(Strings.message_text, Strings.please_select_one_for_which_you_are_scanning)
        }
    }

    handlePatRollChange = (value, index, array) => {
        let newArray = JSON.parse(JSON.stringify(array))
        newArray[index].rollNumber = value
        this.setState({ studentsScanData: newArray }, () => {
            this.validateStudentIds(newArray, true, index)
        })
    }

    handlePatMarksChange = (value, marksIndex, labelIndex, studentIndex, array) => {
        let newArray = JSON.parse(JSON.stringify(array))
        newArray[studentIndex].marksData[labelIndex].marks[marksIndex].mark = value.length > 0 ? (value == 0 || value == 1) ? parseInt(value) : 0 : value
        this.setState({ studentsScanData: newArray })
    }

    onSummaryCancel = () => {
        this.setState({ summary: false })
    }

    validateData = (data) => {
        const { studentsScanData } = this.state
        let valid = true
        for (let i = 0; i < data.length; i++) {            
            if (data[i].rollNumber.length != 4) {
                data[i].stdErr = Strings.srn_length_error
                this.setState({
                    studentsScanData: data
                })
                valid = false
                return
            } else if(data[i].stdErr != '') {
                valid = false
                return
            }
            else if(data[i].stdErr == '') {
                for(let j = 0; j<studentsScanData.length; j++) {
                    if(studentsScanData[j].studentObj.studentId == data[i].studentObj.studentId && i != j) {
                        data[i].stdErr = Strings.duplicate_srn_found
                        data[j].stdErr = Strings.duplicate_srn_found
                        this.setState({
                            studentsScanData: data
                        })
                        valid = false
                        return
                    } else {
                        data[i].stdErr = ''
                        data[j].stdErr = ''
                    }
                }
            }
            for (let j = 0; j < data[i].marksData.length; j++) {
                for (let k = 0; k < data[i].marksData[j].marks.length; k++) {
                    if (data[i].marksData[j].marks[k].mark === '' || data[i].marksData[j].marks[k].mark.toString().length === 0) {
                        valid = false
                        return
                    }
                }
            }
        }
        return valid
    }

    onPatSummaryClick = () => {
        const { studentsScanData, studentClass } = this.state
        const { loginData } =  this.props
        let valid = this.validateData(studentsScanData)
        if (valid) {
            let saveData = []
            _.forEach(studentsScanData, (studentsData) => {
                let saveObj = {
                    "classId": studentClass,
                    "studentId": studentsData.studentObj.studentId,
                    "save_status": "No",
                }
            
                let saveMarksInfo = []
                let totalMarks = 0
                let securedMarks = 0
                _.forEach(studentsData.marksData, (marksData) => {
                    _.forEach(marksData.marks, (marksObj, marksIndex) => {                        
                        let mark = marksObj.mark && marksObj.mark.toString().length > 0 ? parseInt(marksObj.mark) : 0

                        totalMarks++
                        securedMarks += mark
                        let saveMarksObj = {
                            "questionId": marksObj.question,
                            "obtainedMarks": marksObj.mark
                        }
                        if(loginData && loginData.data && loginData.data.storeTrainingData) {
                            saveMarksObj.base64 = marksObj.base64
                        }
                        saveMarksInfo.push(saveMarksObj)
                    })
                })

                saveObj.marksInfo = saveMarksInfo
                saveObj.totalMarks = totalMarks
                saveObj.securedMarks = securedMarks
                saveData.push(saveObj)
            })
            
            this.setState({
                saveData: saveData,
                summary: true
            })
        }
        else {
            Alert.alert(Strings.message_text, Strings.please_correct_marks_data)
        }
    }

    onSubmitClick = async () => {
        const { saveData } = this.state
        let scanData = await getScanData()
        let finalScanData = []
        if (scanData != null) {
            finalScanData = JSON.parse(JSON.stringify(scanData))
        }
        
        saveData.forEach(saveObj => {
            finalScanData.forEach((data, index) => {
                if(data.classId == saveObj.classId && data.studentId == saveObj.studentId) {
                    finalScanData.splice(index, 1)
                }
            })
        })

        saveData.forEach(element => {
            finalScanData.push(element)
        })
        let savedScan = await setScanData(finalScanData)
        if (savedScan) {
            const resetAction = StackActions.reset({
                index: 0,
                actions: [NavigationActions.navigate({ routeName: 'myScan', params: { from_screen: 'cameraActivity' } })],
            });
            this.props.navigation.dispatch(resetAction);
            return true
        }
        else {
            Alert.alert(Strings.message_text, Strings.please_try_again, [{
                text: Strings.ok_text
            }])
        }
    }

    goToDashBoard = () => {
        const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName: 'myScan', params: { from_screen: 'cameraActivity' } })],
        });
        this.props.navigation.dispatch(resetAction);
        return true
    }

    componentDidUpdate(prevProps) {
        if (prevProps != this.props) {
            const { calledSavedData } = this.state
            const { savedScanData } = this.props
            if (calledSavedData) {
                if (savedScanData && prevProps.savedScanData !== savedScanData) {
                    this.setState({ isLoading: false, calledSavedData: false })
                    if (savedScanData.status && savedScanData.status == 200) {

                        Alert.alert(Strings.message_text, Strings.saved_successfully, [{
                            text: Strings.ok_text, onPress: () => { this.goToDashBoard() }
                        }])

                    } else {
                        Alert.alert(Strings.message_text, Strings.please_try_again, [{
                            text: Strings.ok_text
                        }])
                    }
                }
            }
        }
    }

    renderPatSummary = () => {
        const { saveData } = this.state
        return (
            <View style={{ marginBottom: '5%', width: '100%' }}>
                {saveData.map((data, index) => {                    
                    return (
                        <StudentsSummaryCard
                            key={index}
                            studentRollNumber={data.studentId}
                            totalMarks={data.totalMarks}
                            securedMarks={data.securedMarks}
                        />
                    )
                })}
            </View>
        );
    }

    renderPatStudnetsData = () => {
        const { studentsScanData } = this.state

        return (
            <View style={{ marginBottom: '5%', width: '100%' }}>
                {studentsScanData.map((data, index) => {
                    return (
                        <NumeracyScanCard
                            key={index}
                            studentIndex={index}
                            rollNumber={data.rollNumber}
                            stdErr={data.stdErr}
                            onChangeText={(text) => this.handlePatRollChange(text, index, studentsScanData)}
                            editable={true}
                            marksData={data.marksData}
                            onMarksChangeText={(text, marksIndex, labelIndex) => this.handlePatMarksChange(text, marksIndex, labelIndex, index, studentsScanData)}
                        />
                    )
                })}
            </View>
        );
    }

    render() {
        const { isLoading, studentsScanData, studentClass, summary, saveData, examDate, popupVisible, popupData, defaultSelectedStuName } = this.state;
        const { loginData } = this.props
        let headerTitle = Strings.up_saralData

        return (

            <View style={{ flex: 1, backgroundColor: AppTheme.WHITE_OPACITY }}>
                <HeaderComponent
                    title={headerTitle}
                />
                {(loginData && loginData.data) && 
                    <View style={{ flexDirection: 'row', width: '100%'}}>
                        <Text 
                            style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, color: AppTheme.BLACK, fontWeight: 'bold', paddingLeft: '5%',  paddingVertical: '2%', width: '50%' }}
                        >
                            {Strings.school_name+': '}
                            <Text style={{ fontWeight: 'normal'}}>
                                {loginData.data.schoolInfo.school}
                            </Text>
                        </Text>
                        <Text 
                            style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, color: AppTheme.BLACK, fontWeight: 'bold', paddingLeft: '4%', paddingVertical: '2%', width: '50%' }}
                        >
                            {Strings.schoolId_text+': '}
                            <Text style={{ fontWeight: 'normal'}}>
                                {loginData.data.schoolInfo.schoolCode}
                            </Text>
                        </Text>
                    </View>}
                <Text
                    style={{ fontSize: AppTheme.FONT_SIZE_REGULAR - 3, color: AppTheme.BLACK, fontWeight: 'bold', paddingHorizontal: '5%',}}
                >
                    {Strings.version_text + ' : '}
                    <Text style={{ fontWeight: 'normal' }}>
                        {apkVersion}
                    </Text>
                </Text>
                {studentClass.length > 0 &&
                    <View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                            <Text style={styles.tabLabelStyle}>{`${Strings.class_text}: ${studentClass}`}</Text>
                            <Text style={styles.tabLabelStyle}>{`${Strings.exam_date}: ${examDate}`}</Text>
                        </View>
                    </View>
                }
                {!summary ? <View>
                    <ScrollView
                        contentContainerStyle={{ paddingTop: '5%', paddingBottom: '50%', backgroundColor: AppTheme.WHITE_OPACITY }}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        keyboardShouldPersistTaps={'handled'}
                    >
                        {studentsScanData && studentsScanData.length > 0 &&
                            <View style={styles.container1}>
                                {this.renderPatStudnetsData()}
                                <View style={[styles.container3, { paddingTop: '5%', paddingBottom: '5%', width: '100%' }]}>
                                    <ButtonComponent
                                        customBtnStyle={[styles.cancelBtnStyle, { width: '35%', }]}
                                        customBtnTextStyle={styles.editBtnTextStyle}
                                        btnText={Strings.cancel_text}
                                        onPress={this.onBack}
                                    />
                                    <ButtonComponent
                                        customBtnStyle={styles.nxtBtnStyle}
                                        customBtnTextStyle={styles.nxtBtnTextStyle}
                                        btnText={Strings.summary_text}
                                        onPress={this.onPatSummaryClick}
                                    />
                                </View>
                            </View>
                        }
                    </ScrollView>
                </View> :
                    <View style={{ backgroundColor: AppTheme.WHITE_OPACITY }}>
                        <Text style={styles.studentDetailsTxtStyle}>{Strings.summary_scanned_data}</Text>
                        <ScrollView
                            contentContainerStyle={{ backgroundColor: AppTheme.WHITE_OPACITY, paddingBottom: '50%', flexGrow: 1 }}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                            keyboardShouldPersistTaps={'handled'}
                        >

                            {saveData && saveData.length > 0 && this.renderPatSummary()}
                            <View style={[styles.container3, { paddingTop: '5%', paddingBottom: '5%' }]}>
                                <ButtonWithIcon
                                    customBtnStyle={styles.editBtnStyle}
                                    customBtnTextStyle={styles.editBtnTextStyle}
                                    bgColor={AppTheme.TAB_BORDER}
                                    btnIcon={require('../../assets/images/editIcon.png')}
                                    btnText={Strings.edit_text}
                                    onPress={this.onSummaryCancel}

                                />
                                <ButtonComponent
                                    customBtnStyle={styles.submitBtnStyle}
                                    btnText={Strings.submit_text}
                                    onPress={this.onSubmitClick}
                                />
                            </View>
                        </ScrollView>

                    </View>

                }
                <PopupDialog
                    visible={popupVisible} 
                    popupData={popupData}
                    defaultSelectedStuName={defaultSelectedStuName} 
                    onDropDownSelect={this.onDropDownSelect} 
                    onSubmitClick={this.onDropDownSubmitClick}
                />
                {isLoading && <Spinner animating={isLoading} />}
            </View>
        );
    }
}

const styles = {
    container1: {
        flex: 1,
        alignItems: 'center'
    },
    tabLabelStyle: {
        lineHeight: 30,
        textAlign: 'center',
        fontSize: AppTheme.FONT_SIZE_REGULAR,
        color: AppTheme.BLACK,
        letterSpacing: 1,
        fontWeight: 'bold'
    },
    container3: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: '4%',
        backgroundColor: AppTheme.WHITE_OPACITY
    },
    cancelBtnStyle: {
        backgroundColor: 'transparent',
        width: '40%',
        borderWidth: 1,
        borderColor: AppTheme.BTN_BORDER_GREY
    },
    cancelBtnTextStyle: {
        color: AppTheme.BLACK
    },
    nxtBtnStyle: {
        backgroundColor: 'transparent',
        width: '55%',
        borderWidth: 1,
        borderColor: AppTheme.BLUE
    },
    nxtBtnTextStyle: {
        color: AppTheme.BLUE
    },
    submitBtnStyle: {
        width: '60%',
    },
    studentDetailsTxtStyle: {
        color: AppTheme.GREY_TITLE,
        fontSize: AppTheme.FONT_SIZE_MEDIUM,
        paddingHorizontal: '5%',
        fontWeight: 'bold',
        letterSpacing: 1,
        lineHeight: 30
    },
    editBtnStyle: {
        width: '35%',
        justifyContent: 'space-evenly'
    },
    editBtnTextStyle: {
        color: AppTheme.BLACK
    }
}

const mapStateToProps = (state) => {
    return {
        loginData: state.loginData,
        ocrLocalResponse: state.ocrLocalResponse,
        filteredData: state.filteredData,
        studentsAndSavedScanData: state.studentsAndSavedScanData,
        savedScanData: state.savedScanData,
    }
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        APITransport: APITransport
    }, dispatch)
}

export default (connect(mapStateToProps, mapDispatchToProps)(PatScanDetailsComponent));