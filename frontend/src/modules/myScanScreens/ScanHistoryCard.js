import React from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native';
import AppTheme from '../../utils/AppTheme';
import Strings from '../../utils/Strings';

const ScanHistoryCard = ({
    customContainerStyle,
    className,
    scanStatus,
    saveStatus,
    onPressStatus,
    onPressContinue,
    onPressSave,
    showButtons,
    showContinueBtn,
    scanStatusShow
}) => {
    return (
        <TouchableOpacity
            style={[styles.container, customContainerStyle]}
            disabled

        >
            <View style={{ flexDirection: 'row', width: '85%', alignItems: 'center', paddingTop: '3%', paddingLeft: '1%', paddingRight: '1%', paddingBottom: '5%' }}>
                <View>
                    <View style={styles.scanCardStyle}>
                        <View style={[styles.scanLabelStyle, styles.scanLabelKeyStyle]}>
                            <Text>{Strings.class_text}</Text>
                        </View>
                        <View style={[styles.scanLabelStyle, styles.scanLabelValueStyle]}>
                            <Text>{className}</Text>
                        </View>
                    </View>
                    <View style={styles.scanCardStyle}>
                        <View style={[styles.scanLabelStyle, styles.scanLabelKeyStyle,]}>
                            <Text>{Strings.scan_status}</Text>
                        </View>
                        <View style={[styles.scanLabelStyle, styles.scanLabelValueStyle,]}>
                            <Text>{scanStatus}</Text>
                        </View>
                    </View>
                    <View style={styles.scanCardStyle}>
                        <View style={[styles.scanLabelStyle, styles.scanLabelKeyStyle, { borderBottomWidth: 1 }]}>
                            <Text>{Strings.save_status}</Text>
                        </View>
                        <View style={[styles.scanLabelStyle, styles.scanLabelValueStyle, { borderBottomWidth: 1 }]}>
                            <Text>{saveStatus}</Text>
                        </View>
                    </View>
                </View>
            </View>
            <View style={{ marginBottom: '3%', width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', width: '85%' }}>      
                    {scanStatusShow &&
                        <TouchableOpacity
                            style={{ backgroundColor: AppTheme.WHITE, borderRadius: 4, width: showButtons ? '45%' : '80%', alignItems: 'center', justifyContent: 'center', elevation: 8, paddingVertical: 4 }}
                            onPress={onPressStatus}
                        >
                            <Text>{Strings.scan_status}</Text>
                        </TouchableOpacity>}
                    {showButtons &&  
                    <TouchableOpacity
                        style={{ backgroundColor: AppTheme.LIGHT_GREY, borderRadius: 4, width: scanStatusShow ? '45%' : '80%', alignItems: 'center', justifyContent: 'center', elevation: 8, paddingVertical: 4 }}
                        onPress={onPressSave}
                    >
                        <Text style={{ color: AppTheme.BLACK }}>{Strings.save_scan}</Text>
                    </TouchableOpacity>}
                </View>
                </View>
                <View style={{ marginBottom: '3%', width: '100%' }}>
                {showContinueBtn && 
                <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', width: '85%' }}>
                    <TouchableOpacity
                        style={{ backgroundColor: AppTheme.GREY, borderRadius: 4, width: '80%', alignItems: 'center', justifyContent: 'center', elevation: 8, paddingVertical: 4 }}
                        onPress={onPressContinue}
                    >
                        <Text style={{ color: AppTheme.WHITE }}>{Strings.continue_scan}</Text>
                    </TouchableOpacity>
                </View>}
                </View>
        </TouchableOpacity>
    );
}

const styles = {
    container: {
        backgroundColor: AppTheme.BLUE,
        width: '100%',
        borderRadius: 8
    },
    scanCardStyle: {
        flexDirection: 'row',
        paddingHorizontal: '2%',
    },
    scanLabelStyle: {
        padding: '3%',
        borderTopWidth: 1,
        borderColor: AppTheme.BLACK
    },
    scanLabelKeyStyle: {
        width: '40%',
        backgroundColor: AppTheme.TAB_BORDER,
        borderLeftWidth: 1,
        borderRightWidth: .5,
    },
    scanLabelValueStyle: {
        width: '60%',
        backgroundColor: AppTheme.WHITE,
        borderLeftWidth: .5,
        borderRightWidth: 1,
    }
}

export default ScanHistoryCard;