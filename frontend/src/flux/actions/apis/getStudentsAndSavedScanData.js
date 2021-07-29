/**
 * Students List and Exam Meta Data
 */
import API from './api';
import C from '../constants';

export class GetStudentsAndSavedScanData extends API {
    constructor(requestBody, token, timeout = 30000) {
        super('POST', timeout, false);
        this.requestBody = requestBody;
        this.token = token;
        this.type = C.GET_STUDENTS_AND_SAVED_SCAN_DATA;
    }

    toString() {
        return `${super.toString()} requestBody: ${this.requestBody} type: ${this.type}`
    }

    processResponse(res) {
        super.processResponse(res)
        if (res) {
            this.response=res;
        }
    }

    apiEndPoint() {
        return `${super.apiEndPoint()}/students?`;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Token': `${this.token}`
        }
    }

    getBody() {
        return null
    }

    getParams() {
        return this.requestBody
    }

    getPayload() {
        return this.response
    }
}