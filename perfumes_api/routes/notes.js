const express = require('express');
const router = express.Router();

const AuditLogs = require('../lib/AuditLogs');
const Notes = require('../db/models/Notes');

const ExcelExport = require("../lib/Export");
const ExcelImport = require("../lib/Import");
const fs = require("fs");
const path = require("path");
const emitter = require("../lib/Emitter");

const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
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

const upload = multer({ storage }).single("import_note");

router.get('/', async (req, res) => {
    try{
        let notes = await Notes.find({});
        res.json(Response.successResponse(notes));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.post('/add', auth.checkRoles("note_add"), async (req, res) => {
    let body = req.body;
    try{
        if(!body.name || body.name.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["name"]));
        }
        
        let finded = await Notes.findOne({name: body.name});
        
        if(finded) {
            throw new CustomError(Enum.HTTP_CODES.CONFLICT, i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("COMMON.ALREADY_EXIST", req.user.language, ["Note"]));
        }

        if(!body.image_url) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["image"]));
        }

        let note = new Notes({
            name: body.name,
            image_url: body.image_url,
            created_by: req.user._id
        });

        await note.save();

        AuditLogs.info(req.user.email, "Notes", "Add", note);
        logger.info(req.user.email, "Notes", "Add", note);
        emitter.getEmitter("notifications").emit("messages", {message: "note added."});

        res.json(Response.successResponse({success: true, data: note}));

    } catch (err) {
        logger.error(req.user.email, "Notes", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', auth.checkRoles("note_update"), async (req, res) => {
    
    let body = req.body;
    
    try{
        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));
        }

        const before = await Notes.findById(body._id);

        if(!before) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["note"]));
        }

        let updates = {};

        if(body.name) {
            let finded = await Notes.find({name: body.name});
            if(finded.length > 0) {
                throw new CustomError(Enum.HTTP_CODES.CONFLICT, i18n.translate("COMMON.NOT_ACCEPTABLE", req.user.language), i18n.translate("COMMON.ALREADY_EXIST", req.user.language, ["Note"]));
            } else {
                updates.name = body.name;
            }
        }

        if(body.image_url) {
            updates.image_url = body.image_url; 
        }

        const updated = await Notes.findByIdAndUpdate(body._id, updates, {new: true});

        AuditLogs.info(req.user.email, "Notes", "Update", {before: before, after: updated});
        logger.info(req.user.email, "Notes", "Update", {before: before, after: updated});
        emitter.getEmitter("notifications").emit("messages", {message: "note updated."});

        res.json(Response.successResponse({success: true, data: updated}));

    } catch (err) {
        logger.error(req.user.email, "Notes", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', auth.checkRoles("note_delete"), async (req, res) => {
    try{
        const noteId = req.params.id;

        const note = await Notes.findById(noteId);

        if(note) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["Note"]));
        }

        await Notes.deleteOne({_id: notesId});

        AuditLogs.info(req.user.email, "Notes", "Delete", note);
        logger.info(req.user.email, "Notes", "Delete", note);
        emitter.getEmitter("notifications").emit("messages", {message: "note deleted."});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user.email, "Notes", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.get("/export", auth.checkRoles("note_export"), async (req, res) => {
    try{
        let notes = await Notes.find({}).populate("created_by", "email");

        const formattedData = notes.map(n => ({
            name: n.name,
            image_url: n.image_url,
            created_by: n.created_by ? n.created_by.email : "N/A",
            created_at: n.created_at
        }))

        let excelTable = ExcelExport.toExcel(
        ["NAME", "CREATED_BY", "CREATED_AT", "IMAGE_URL"],
        ["name", "created_by", "created_at", "image_url"],
        formattedData
        );

        let filePath = path.join(__dirname, "../tmp", `notes_excel_${Date.now()}.xlsx`);
        
        fs.writeFileSync(filePath, excelTable, "UTF-8");
        res.download(filePath, () => {
            fs.unlinkSync(filePath);
        });

        AuditLogs.info(req.user.email, "Notes", "Export Excel", "exported");
        logger.info(req.user.email, "Notes", "Export Excel", "exported");
        emitter.getEmitter("notifications").emit("messages", {message: "note exported."});

    } catch (err) {
        logger.error(req.user.email, "Notes", "Export Excel", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post("/import", auth.checkRoles("note_import"), upload, async (req, res) => {
    try {

        let file = req.file;
        let rows = ExcelImport.fromExcel(file.path);

        for(let i = 1; i < rows.length; i++){
            
            const row = rows[i];
            
            if(!row || row.length !== 2) continue;

            const [name, image_url] = row;

            if(!name || !image_url) continue;

            await Concentrations.create({
                name,
                image_url,
                created_by: req.user._id
            });
        }

        fs.unlinkSync(file.path);

        AuditLogs.info(req.user.email, "Notes", "Import Excel", "imported");
        logger.info(req.user.email, "Notes", "Import Excel", "imported");
        emitter.getEmitter("notifications").emit("messages", {message: "note imported."});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user.email, "Notes", "Import Excel", err);

        if(req.file?.path) {
            try { fs.unlinkSync(req.file.path); } catch (err) {}
        }

        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;