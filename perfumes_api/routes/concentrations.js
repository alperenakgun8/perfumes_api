var express = require('express');
var router = express.Router();

const Concentrations = require('../db/models/Concentrations');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require("../config/enum");

router.get('/', async (req,res) => {
    try{
        let concentrations = await Concentrations.find({});
        res.json(Response.successResponse(concentrations));
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

        res.json(Response.successResponse({success: true}));

    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', async(req,res) => {
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

        await Concentrations.updateOne({_id: body._id}, updates);

        res.json(Response.successResponse({ success: true }));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', async (req,res) => {
    try{
        concentrationId = req.params.id;
        const deleted = await Concentrations.deleteOne({_id: concentrationId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Concentration not found or already deleted");
        }
        res.json(Response.successResponse({ success: true }));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;