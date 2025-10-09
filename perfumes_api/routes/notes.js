const express = require('express');
const router = express.Router();

const AuditLogs = require('../lib/AuditLogs');
const Notes = require('../db/models/Notes');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();
const config = require('../config');
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

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
        
        let finded = await Notes.find({name: body.name});
        
        if(finded.length > 0) {
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

        AuditLogs.info(req.user?.email, "Notes", "Add", note);
        logger.info(req.user?.email, "Notes", "Add", note);

        res.json(Response.successResponse({success: true, data: note}));

    } catch (err) {
        logger.error(req.user?.email, "Notes", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', auth.checkRoles("note_update"), async (req, res) => {
    let body = req.body;
    try{
        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));
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

        AuditLogs.info(req.user?.email, "Notes", "Update", updated);
        logger.info(req.user?.email, "Notes", "Update", updated);

        res.json(Response.successResponse({success: true, data: updated}));

    } catch (err) {
        logger.error(req.user?.email, "Notes", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', auth.checkRoles("note_delete"), async (req, res) => {
    try{
        const notesId = req.params.id;
        const deleted = await Notes.deleteOne({_id: notesId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["Note"]));
        }

        AuditLogs.info(req.user?.email, "Notes", "Delete", deleted);
        logger.info(req.user?.email, "Notes", "Delete", deleted);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Notes", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;