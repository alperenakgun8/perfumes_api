var express = require('express');
var router = express.Router();

const Notes = require('../db/models/Notes');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');

router.get('/', async (req, res) => {
    try{
        let notes = await Notes.find({});
        res.json(Response.successResponse(notes));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.post('/add', async (req, res) => {
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

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', async (req, res) => {
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

        await Notes.updateOne({_id: body._id}, updates);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', async (req, res) => {
    try{
        const notesId = req.params.id;
        const deleted = await Notes.deleteOne({_id: notesId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Note not found or already deleted");
        }

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;