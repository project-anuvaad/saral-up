import apiStatus from './apiStatus/apiStatus';
import OcrLocalResponseReducer from './OcrLocalResponseReducer';
import LoginReducer from './LoginReducer';
import getStudentsAndSavedScanDataReducer from './getStudentsAndSavedScanDataReducer';
import filteredDataReducer from './filteredDataReducer';
import saveScanReducer from './saveScanReducer';
import scanTypeReducer from './scanTypeReducer';

export default {
    apiStatus: apiStatus,
    ocrLocalResponse: OcrLocalResponseReducer,
    loginData: LoginReducer,
    studentsAndSavedScanData: getStudentsAndSavedScanDataReducer,
    filteredData: filteredDataReducer,
    savedScanData: saveScanReducer,
    scanTypeData: scanTypeReducer
}