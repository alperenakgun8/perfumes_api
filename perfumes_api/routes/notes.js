const express = require('express');
const router = express.Router();

const AuditLogs = require('../lib/AuditLogs');
const Notes = require('../db/models/Notes');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();

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
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "name field must be filled");
        }
        
        let finded = await Notes.find({name: body.name});

        if(finded.length > 0) {
            throw new CustomError(Enum.HTTP_CODES.CONFLICT, Enum.VALIDATION_ERROR, "Note has already added");
        }

        if(!body.image_url) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "image field must be filled");
        }

        let note = new Notes({
            name: body.name,
            image_url: body.image_url
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
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "_id field must be filed");
        }

        let updates = {};

        if(body.name) {
            let finded = await Notes.find({name: body.name});
            if(finded.length > 0) {
                throw new CustomError(Enum.HTTP_CODES.CONFLICT, Enum.VALIDATION_ERROR, "Note has already added");
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
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Note not found or already deleted");
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