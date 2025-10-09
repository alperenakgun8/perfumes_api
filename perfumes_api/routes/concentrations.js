const express = require('express');
const router = express.Router();

const Concentrations = require('../db/models/Concentrations');
const AuditLogs = require('../lib/AuditLogs');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require("../config/enum");
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();
const config = require('../config');
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

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

        let finded = await Concentrations.find({name: body.name});

        if(finded.length > 0) {
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

        AuditLogs.info(req.user?.email, "Concentrations", "Add", concentration);
        logger.info(req.user?.email, "Concentrations", "Add", concentration);

        res.json(Response.successResponse({success: true, data: concentration
        }));

    } catch(err) {
        logger.error(req.user?.email, "Concentrations", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update',  auth.checkRoles("concentration_update"), async(req,res) => {
    let body = req.body;
    try{
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

        const updated = await Concentrations.findByIdAndUpdate(body._id, updates, {new: true});

         if (!updated) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["Concentration"]));
        }

        AuditLogs.info(req.user?.email, "Concentrations", "Update", updated);
        logger.info(req.user?.email, "Concentrations", "Update", updated);

        res.json(Response.successResponse({ success: true, data: updated }));

    } catch (err) {
        logger.error(req.user?.email, "Concentrations", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id',  auth.checkRoles("concentration_delete"), async (req,res) => {
    try{
        const concentrationId = req.params.id.trim();
        const deleted = await Concentrations.deleteOne({_id: concentrationId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["Concentration"]));
        }

        AuditLogs.info(req.user?.email, "Concentrations", "Delete", deleted);
        logger.info(req.user?.email, "Concentrations", "Delete", deleted);

        res.json(Response.successResponse({ success: true }));

    } catch (err) {
        logger.error(req.user?.email, "Concentrations", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;