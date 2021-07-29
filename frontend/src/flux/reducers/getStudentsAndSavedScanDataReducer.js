import C from '../actions/constants';

export default function (state={}, action) {
    switch(action.type) {
        case C.GET_STUDENTS_AND_SAVED_SCAN_DATA:
            return action.payload;
        default:
            return state;
    }
}