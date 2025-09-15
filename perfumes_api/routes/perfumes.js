var express = require('express');
var router = express.Router();

const Perfumes = require('../db/models/Perfumes');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const PerfumeNotes = require('../db/models/PerfumeNotes');

router.get('/', async (req, res) => {
    try{
        let perfumes = await Perfumes.find({});
        res.json(Response.successResponse(perfumes));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/:id', async (req, res) => {
    try{
        const perfumeId = req.params.id;
        let perfume = await Perfumes.findOne({_id: perfumeId}).populate('concentration_id', 'name display_name');

        if(!perfume) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: "perfume not found"}));
        }

        let notes = await PerfumeNotes.find({perfume_id: perfumeId}).populate('note_id', 'name image_url').select('note_type note_id');

        let responseData = {
            ...perfume.toObject(),
            notes: notes.map(n => ({
                _id: n.note_id._id,
                name: n.note_id.name,
                image_url: n.note_id.image_url,
                note_type: n.note_type
            }))
        }
        res.json(Response.successResponse(responseData));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.post('/add', async (req, res) => {
    let body = req.body;
    try{
        if(!body.name) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.BAD_REQUEST, "name field must be filled");
        }
        if(!body.description) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.BAD_REQUEST, "description field must be filled");
        }
        if(!body.concentration_id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.BAD_REQUEST, "concentration_id field must be filled");
        }
        if(!body.brand){
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.BAD_REQUEST, "brand field must be filled");
        }
        if(!body.notes) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "notes field must be filled");
        }

        if(!Array.isArray(body.notes) || body.notes.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "notes must be a non-empty array");
        }

        let perfume = new Perfumes({
            name: body.name,
            description: body.description,
            image_url: body.image_url || "",
            concentration_id: body.concentration_id,
            brand: body.brand
        });

        await perfume.save();

        for(const note of body.notes) {
            if(!note._id) {
                throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "each note must have _id");
            }
            if(!note.note_type) {
                throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "each note must have note_type");
            }
            if(note.note_type !== "TOP" && note.note_type !== "MIDDLE" && note.note_type !== "BASE") {
                throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "note_type must be 'TOP', 'MIDDLE' or 'BASE'");
            }
            let perfumeNotes = new PerfumeNotes({
            perfume_id: perfume._id,
            note_id: note._id,
            note_type: note.note_type
            });
            await perfumeNotes.save();
        }

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', async (req, res) => {
    let body = req.body;
    try {
        if(!body._id){
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "_id field must be filled");
        }

        if(body.name && body.concentration_id) {
            let finded = await Perfumes.findOne({name: body.name, concentration_id: body.concentration_id});
            if(finded) {
                throw new CustomError(Enum.HTTP_CODES.CONFLICT, "Conflict Error", "perfume already added");
            }
        }

        if(body.notes) {
            if(!Array.isArray(body.notes) || body.notes.length === 0) {
                throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "notes must be a non-empty array");
            } else {
                await PerfumeNotes.deleteMany({perfume_id: body._id});
                for(const note of body.notes) {
                    if(!note._id) {
                        throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "each note must have _id");
                    }
                    if(!note.note_type) {
                        throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "each note must have note_type");
                    }
                    if(note.note_type !== "TOP" && note.note_type !== "MIDDLE" && note.note_type !== "BASE") {
                        throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "note_type must be 'TOP', 'MIDDLE' or 'BASE'");
                    }
                    let perfumeNotes = new PerfumeNotes({
                        perfume_id: body._id,
                        note_id: note._id,
                        note_type: note.note_type
                    });
                    await perfumeNotes.save();
                }
            }
        }

         let updatesPerfume = {};

        if(body.name) {
            updatesPerfume.name = body.name;
        }

        if(body.description) {
            updatesPerfume.description = body.description;
        }

        if(body.concentration_id) {
            updatesPerfume.concentration_id = body.concentration_id;
        }

        if(body.image_url) {
            updatesPerfume.image_url = body.image_url;
        }
        
        await Perfumes.updateOne({_id: body._id}, updatesPerfume);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/delete', async (req, res) => {
    let body = req.body;
    try{
        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "_id field must be filled");
        }

        let deletedPerfumeNotes = await PerfumeNotes.deleteMany({perfume_id: body._id});
        console.log(deletedPerfumeNotes.deletedCount);

        let deleted = await Perfumes.deleteOne({_id: body._id});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "perfume not found or already deleted");
        }

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;