import axios from 'axios';
import C from '../constants'
// import RNFetchBlob from 'rn-fetch-blob'
import Strings from '../../../utils/Strings';


export default function dispatchAPI(api) {        
    if (api.reqType === 'MULTIPART') {
        return dispatch => {
            dispatch(apiStatusAsync(true, false, ''))
            axios.post(api.apiEndPoint(), api.getFormData(), api.getHeaders())
                .then(function (res) {
                    api.processResponse(res.data)
                    dispatch(apiStatusAsync(false, false, null, res.data))
                    dispatch(dispatchAPIAsync(api));
                    if (typeof api.getNextStep === 'function' && res.data && (res.status == 200 || res.status == 201))
                        dispatch(api.getNextStep())
                })
                .catch(function (err) {
                    dispatch(apiStatusAsync(false, true, Strings.something_went_wrong_please_try_again, null, err && err.response && err.response.status && err.response.status === 401 ? true : false))
                });
        }
    }
    else {
        if (api.method === 'POST') {
            return dispatch => {
                dispatch(apiStatusAsync(true, false, ''))
                let apiResponse = null
                const source = axios.CancelToken.source()
                const id = setTimeout(() => {
                    if (apiResponse === null) {
                        source.cancel('The request timed out.');
                    }
                }, 60000);
                axios.post(api.apiEndPoint(), api.getBody(), { params: typeof api.getParams == 'function' && api.getParams(), headers: api.getHeaders(), cancelToken: source.token }, )
                    .then(function (res) {
                        apiResponse = res
                        clearTimeout(id)
                        api.processResponse(res)
                        dispatch(apiStatusAsync(false, false, null, res.data))
                        dispatch(dispatchAPIAsync(api));
                        if (typeof api.getNextStep === 'function' && res.data && (res.status == 200 || res.status == 201))
                            dispatch(api.getNextStep())
                    })
                    .catch(function (err) {                                           
                        clearTimeout(id)
                        if(err && err.message == 'The request timed out.') {
                            dispatch(apiStatusAsync(false, true, Strings.request_timeout_custom_message, null, err && err.response && err.response.status && err.response.status === 401 ? true : false))
                        }
                        else if(err && err.message == 'Network Error') {
                            dispatch(apiStatusAsync(false, true, Strings.you_seem_to_be_offline_please_check_your_internet_connection, null, err && err.response && err.response.status && err.response.status === 401 ? true : false))
                        }
                        else if(api.type == 'login_process') {
                            dispatch(apiStatusAsync(false, true, err && err.response && err.response.status && err.response.status === 422 ? Strings.schoolid_password_doesnot_match : Strings.something_went_wrong_please_try_again, null, err && err.response && err.response.status && err.response.status === 401 ? true : false))
                        }
                        else {
                            dispatch(apiStatusAsync(false, true, Strings.something_went_wrong_please_try_again, null, err && err.response && err.response.status && err.response.status === 401 ? true : false))
                        }
                    });
            }
        } else if (api.method === 'DELETE') {
            return dispatch => {
                dispatch(apiStatusAsync(true, false, ''))
                axios.delete(api.apiEndPoint(), api.getHeaders())
                    .then(function (res) {
                        api.processResponse(res.data)
                        dispatch(apiStatusAsync(false, false, null, res.data))
                        dispatch(dispatchAPIAsync(api));
                        if (typeof api.getNextStep === 'function' && res.data && (res.status == 200 || res.status == 201))
                            dispatch(api.getNextStep())
                    })
                    .catch(function (err) {
                        dispatch(apiStatusAsync(false, true, Strings.something_went_wrong_please_try_again, null, err && err.response && err.response.status && err.response.status === 401 ? true : false))
                    });
            }
        } else {            
            return dispatch => {
                dispatch(apiStatusAsync(true, false, ''))
                let apiResponse = null
                const source = axios.CancelToken.source()
                const id = setTimeout(() => {
                    if (apiResponse === null) {
                        source.cancel('The request timed out.');
                    }
                }, 60000);
                axios.get(api.apiEndPoint(), { headers: api.getHeaders(), cancelToken: source.token },)
                    .then(function (res) {
                        apiResponse = res
                        clearTimeout(id)
                        api.processResponse(res)
                        dispatch(apiStatusAsync(false, false, null, res.data))
                        dispatch(dispatchAPIAsync(api));
                        if (typeof api.getNextStep === 'function' && res.data && (res.status == 200 || res.status == 201))
                            dispatch(api.getNextStep())
                    })
                    .catch(function (err) {                                                
                        if (err.response)
                            dispatch(apiStatusAsync(false, true, Strings.something_went_wrong_please_try_again, null, err && err.response && err.response.status && err.response.status === 401 ? true : false))
                    });
            }
        }
    }
}


function dispatchAPIAsync(api) {
    return {
        type: api.type,
        payload: api.getPayload()
    }
}

function apiStatusAsync(progress, error, message, res = null, unauthorized = false) {
    if (res === null || !(res.status && res.status.statusCode && res.status.statusCode !== 200 && res.status.statusCode !== 201)) {
        return {
            type: C.APISTATUS,
            payload: {
                progress: progress,
                error: error,
                message: message,
                unauthorized: unauthorized
            }
        }
    }
    else {
        return {
            type: C.APISTATUS,
            payload: {
                progress: progress,
                error: (res.status.statusCode === 200 || res.status.statusCode === 201) ? false : true,
                message: (res.status.statusCode === 200 || res.status.statusCode === 201) ? message : res.status.errorMessage,
                unauthorized: unauthorized
            }
        }
    }
}

