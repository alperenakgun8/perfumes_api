var express = require('express');
var router = express.Router();

const Concentrations = require('../db/models/Concentrations');
const AuditLogs = require('../lib/AuditLogs');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require("../config/enum");
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();

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
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "name field must be filled");
        }

        let finded = await Concentrations.find({name: body.name});

        if(finded.length > 0) {
            throw new CustomError(Enum.HTTP_CODES.CONFLICT, Enum.VALIDATION_ERROR, "Concentration has already added");
        }

        if(!body.display_name || body.display_name.length == 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "display_name field must be filled");
        }

        let concentration = new Concentrations({
            name: body.name,
            display_name: body.display_name
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
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "_id field must be filled");
        }

        let updates = {};

        if(body.name) {
            let finded = await Concentrations.find({name: body.name});
            if(finded.length > 0) {
                throw new CustomError(Enum.HTTP_CODES.CONFLICT, Enum.VALIDATION_ERROR, "Concentration already added");
            } else {
                updates.name = body.name;
            }
        }

        if(body.display_name) {
            updates.display_name = body.display_name;
        }

        const updated = await Concentrations.findByIdAndUpdate(body._id, updates, {new: true});

         if (!updated) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.VALIDATION_ERROR, "Concentration not found");
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
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Concentration not found or already deleted");
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