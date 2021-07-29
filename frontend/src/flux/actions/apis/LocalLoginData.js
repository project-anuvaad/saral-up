import C from '../constants';


export const LocalLoginData = (data) => {
    return {
        type: C.LOGIN_PROCESS,
        payload: data
    };
};