import C from '../constants';


export const LocalStudentsAndSavedScanData = (data) => {
    return {
        type: C.GET_STUDENTS_AND_SAVED_SCAN_DATA,
        payload: data
    };
};