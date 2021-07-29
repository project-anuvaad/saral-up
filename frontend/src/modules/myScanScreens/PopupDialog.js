import React, { Component } from 'react';
import { ScrollView, View, Modal, Dimensions, Text } from 'react-native';
import AppTheme from '../../utils/AppTheme';
import DropDownMenu from '../common/components/DropDownComponent';
import Strings from '../../utils/Strings';
import ButtonComponent from '../common/components/ButtonComponent';

const { height, width } = Dimensions.get('window')

export default class PopupDialog extends Component {

    render() {
        const { visible, popupData, customPopStyle, defaultSelectedStuName, onDropDownSelect, onSubmitClick } = this.props;
        return (
            <Modal
                visible={visible}
                transparent={true}
                style={{ backgroundColor: 'rgba(0,0,0, 0.2)' }}
                animationType="fade">
                <View style={{
                    height: height,
                    shadowColor: "black",
                    shadowOpacity: .2,
                    backgroundColor: "#0000",
                    shadowOffset: { height: 3, width: 3 },
                    shadowRadius: 10,

                }}>
                    <ScrollView
                        keyboardShouldPersistTaps={'handled'}
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0, 0.4)' }}>

                        <View
                            style={[{
                                elevation: 10,
                                width: width * .85,
                                backgroundColor: AppTheme.WHITE,
                                marginHorizontal: width * .075,
                                paddingLeft: width * .06,
                                paddingRight: width * 0.06,
                                paddingTop: height * .03,
                                borderRadius: 8,
                            }, customPopStyle]}>
                            {popupData && popupData.length > 0 ?
                                popupData.map((multiStudentsData, arrIndex) => {
                                    return (
                                        <View key={arrIndex}>
                                            <View style={{ alignItems: 'center', paddingBottom: '10%' }}>
                                                <Text
                                                    style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, }}
                                                >
                                                    {`${Strings.multiple_students_found_for_student_number} - `}
                                                    <Text style={{ fontWeight: 'bold' }}>{multiStudentsData.index + 1}</Text>
                                                </Text>
                                                <Text
                                                    style={{ fontSize: AppTheme.FONT_SIZE_REGULAR, }}
                                                >
                                                    {Strings.please_select_one_for_which_you_are_scanning}
                                                </Text>
                                            </View>
                                            <DropDownMenu
                                                customDropContainer={{ marginBottom: '10%' }}
                                                customDropDownStyle={{ width: '70%' }}
                                                options={multiStudentsData.studentIdArr}
                                                onSelect={(idx, value) => onDropDownSelect(idx, value, arrIndex)}
                                                defaultData={defaultSelectedStuName}
                                                defaultIndex={parseInt(multiStudentsData.selectedStuIndex)}
                                                selectedData={multiStudentsData.selectedStuName}
                                                icon={require('../../assets/images/arrow_down.png')}
                                            />
                                        </View>
                                    )
                                })
                                : null}
                            <View style={styles.container3}>
                                <ButtonComponent
                                    customBtnStyle={{ height: 30, minWidth: '40%', maxWidth: '50%', alignSelf: 'center' }}
                                    btnText={Strings.submit_text}
                                    onPress={onSubmitClick}
                                />
                            </View>
                        </View>

                    </ScrollView>
                </View>
            </Modal>
        );
    }
}

const styles = {
    container3: {
        flex: 2,
        paddingBottom: '5%',
        paddingHorizontal: '4%'
    }

};