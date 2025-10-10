const xlsx = require("node-xlsx");
const CustomError = require("./Error");
const Enum = require("../config/enum");
const config = require('../config');
const I18n = require("./i18n");
const i18n = new I18n(config.DEFAULT_LANG);

class Import {
    
    constructor () {

    }

    fromExcel(filePath) {
        
        let workSheets = xlsx.parse(filePath);

        if(!workSheets || workSheets.length === 0) throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("EXCEL.INVALID_EXCEL_FORMAT", req.user.language));

        let rows = workSheets[0].data;

        if(rows.length === 0) throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("EXCEL.EXCEL_FILE_IS_EMPTY", req.user.language));

        return rows;
    }
}

module.exports = new Import();