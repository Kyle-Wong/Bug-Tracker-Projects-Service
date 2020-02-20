const errors = require('./errors');

module.exports = class ResponseBuilder{
    constructor(res){
        this.res = res;
        this.json = {};
    }
    
    end(){
        this.res.json(this.json);
    }
    status(statusCode){
        this.res = this.res.status(statusCode);
        return this;
    }
    success(){
        this.res = this.res.status(200);
        this.json['code'] = 0;
        this.json['message'] = errors.errorCode[0];
        return this;
    }
    error(message){
        this.res = this.res.status(400);
        this.json['code'] = 400;
        this.json['message'] = message;
        return this;
    }
    default(code){
        if(code >= 400)
            this.res = this.res.status(400);
        else
            this.res = this.res.status(200);
    
        this.json['code'] = code;
        this.json['message'] = errors.errorCode[code];
        return this;
    }
    explicit(code,statusCode, message){
        this.res = this.res.status(statusCode);
    
        this.json['code'] = code;
        this.json['message'] = message;
        return this;
    }
    static send(responseBuilder){
        responseBuilder.res.json(responseBiulder.json);
    }
}