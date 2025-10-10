const express = require('express');
const router = express.Router();

const Concentrations = require('../db/models/Concentrations');
const AuditLogs = require('../lib/AuditLogs');

const ExcelExport = require("../lib/Export");
const ExcelImport = require("../lib/Import");
const fs = require("fs");
const path = require("path");

const emitter = require("../lib/Emitter");
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require("../config/enum");
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();
const config = require('../config');
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, next) => {
    next(null, config.FILE_UPLOAD_PATH);
  },
  filename: (req, file, next) => {
    next(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage }).single("import_concentration");

router.get('/', async (req,res) => {
    try{
        let concentrations = await Concentrations.find({});
        res.json(Response.successResponse(concentrations));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.post('/add', auth.checkRoles("concentration_add"), async (req, res) => {
    let body = req.body;
    try{
        if(!body.name || body.name.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["name"]));
        }

        let finded = await Concentrations.findOne({name: body.name});

        if(finded) {
            throw new CustomError(Enum.HTTP_CODES.CONFLICT, i18n.translate("COMMON.ALREADY_EXIST", req.user.language, [""]), i18n.translate("COMMON.ALREADY_EXIST", req.user.language, ["Concentration"]));
        }

        if(!body.display_name || body.display_name.length == 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language, [""]), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["display_name"]));
        }

        let concentration = new Concentrations({
            name: body.name,
            display_name: body.display_name,
            created_by: req.user._id
        });

        await concentration.save();

        AuditLogs.info(req.user.email, "Concentrations", "Add", concentration);
        logger.info(req.user.email, "Concentrations", "Add", concentration);
        emitter.getEmitter("notifications").emit("messages", {message: "concentration added."});

        res.json(Response.successResponse({success: true, data: concentration }));

    } catch(err) {
        logger.error(req.user.email, "Concentrations", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update',  auth.checkRoles("concentration_update"), async(req,res) => {
    try{
        let body = req.body;
        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));
        }

        let updates = {};

        if(body.name) {
            let finded = await Concentrations.find({name: body.name});
            if(finded.length > 0) {
                throw new CustomError(Enum.HTTP_CODES.CONFLICT, i18n.translate("COMMON.ALREADY_EXIST", req.user.language, [""]), i18n.translate("COMMON.ALREADY_EXIST", req.user.language, ["Concentration"]));
            } else {
                updates.name = body.name;
            }
        }

        if(body.display_name) {
            updates.display_name = body.display_name;
        }

        const before = await Concentrations.findById(body._id);

        if (!before) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["Concentration"]));
        }

        const updated = await Concentrations.findByIdAndUpdate(body._id, updates, {new: true});

        AuditLogs.info(req.user?.email, "Concentrations", "Update", {before: before, after: updated});
        logger.info(req.user?.email, "Concentrations", "Update", {before: before, after: updated});
        emitter.getEmitter("notifications").emit("messages", {message: "concentration updated."});

        res.json(Response.successResponse({ success: true, data: updated }));

    } catch (err) {
        logger.error(req.user?.email, "Concentrations", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id',  auth.checkRoles("concentration_delete"), async (req,res) => {
    try{
        const concentrationId = req.params.id;

        const comment = Concentrations.findById(concentrationId);

        if(!comment) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["Concentration"]));
        }

        await Concentrations.deleteOne({_id: concentrationId});

        AuditLogs.info(req.user.email, "Concentrations", "Delete", comment);
        logger.info(req.user.email, "Concentrations", "Delete", comment);
        emitter.getEmitter("notifications").emit("messages", {message: "concentration deleted."});

        res.json(Response.successResponse({ success: true }));

    } catch (err) {
        logger.error(req.user.email, "Concentrations", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.get("/export", /*auth.checkRoles("concentration_export"),*/ async (req, res) => {
    try{
        let concentrations = await Concentrations.find({}).populate("created_by", "email");

        const formattedData = concentrations.map(c => ({
            name: c.name,
            display_name: c.display_name,
            created_by: c.created_by ? c.created_by.email : "N/A",
            created_at: c.created_at
        }))

        let excelTable = ExcelExport.toExcel(
        ["NAME", "DISPLAY_NAME", "CREATED_BY", "CREATED_AT"],
        ["name", "display_name", "created_by", "created_at"],
        formattedData
        );

        let filePath = path.join(__dirname, "../tmp", `concentrations_excel_${Date.now()}.xlsx`);
        
        fs.writeFileSync(filePath, excelTable, "UTF-8");
        res.download(filePath, () => {
            // fs.unlinkSync(filePath);
        });

        AuditLogs.info(req.user.email, "Concentrations", "Export Excel", "exported");
        logger.info(req.user.email, "Concentrations", "Export Excel", "exported");
        emitter.getEmitter("notifications").emit("messages", {message: "concentration exported."});

    } catch (err) {
        logger.error(req.user.email, "Concentrations", "Export Excel", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post("/import", auth.checkRoles("concentration_import"), upload, async (req, res) => {
    try {

        let file = req.file;
        let rows = ExcelImport.fromExcel(file.path);

        for(let i = 1; i < rows.length; i++){
            
            const row = rows[i];
            
            if(!row || row.length !== 2) continue;

            const [name, display_name] = row;

            if(!name || !display_name) continue;

            await Concentrations.create({
                name,
                display_name,
                created_by: req.user._id
            });
        }

        fs.unlinkSync(file.path);

        AuditLogs.info(req.user.email, "Concentrations", "Import Excel", "imported");
        logger.info(req.user.email, "Concentrations", "Import Excel", "imported");
        emitter.getEmitter("notifications").emit("messages", {message: "concentration imported."});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user.email, "Concentrations", "Import Excel", err);

        if(req.file?.path) {
            try { fs.unlinkSync(req.file.path); } catch (err) {}
        }

        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;