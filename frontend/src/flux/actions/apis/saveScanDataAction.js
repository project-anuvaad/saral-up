/**
 * Save Scan Data
 */
import API from '../apis/api';
import C from '../constants';

export class SaveScanData extends API {
    constructor(requestBody, token, timeout = 30000) {
        super('POST', timeout, false);
        
        this.requestBody = requestBody;
        this.token = token;
        this.type = C.SAVE_SCAN_DATA;
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
        return `${super.apiEndPoint()}/studentevaluation`;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Token': `${this.token}`
        }
    }

    getBody() {
        return this.requestBody
    }

    getPayload() {
        return this.response
    }
}