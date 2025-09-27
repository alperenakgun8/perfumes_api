var express = require('express');
var router = express.Router();

const Perfumes = require('../db/models/Perfumes');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const PerfumeNotes = require('../db/models/PerfumeNotes');
const mongoose = require("mongoose");

router.get('/', async (req, res) => {
    try{
        let perfumes = await Perfumes.find({});
        res.json(Response.successResponse(perfumes));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/brands', async (req,res) => {
    try{
        let brands = await Perfumes.find({}).distinct("brand");
        res.json(Response.successResponse(brands));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
})

router.get('/general', async (req,res) => {
    try{
        let perfumes = await Perfumes.find({}).select("_id name brand image_url");
        res.json(Response.successResponse(perfumes));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/:id', async (req, res) => {
    try{
        const perfumeId = req.params.id;

        if(!mongoose.Types.ObjectId.isValid(perfumeId)) {
            return res.status(Enum.HTTP_CODES.BAD_REQUEST).json(Response.errorResponse({code: Enum.HTTP_CODES.BAD_REQUEST, message: "Invalide perfume id"}));
        }

        let perfume = await Perfumes.findById(perfumeId).populate('concentration_id', 'name display_name');

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

router.post('/bynoteid', async (req, res) => {
  try {
    const { noteIds } = req.body;

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR,"noteIds must be a non-empty array");
    }

    const objectIds = noteIds.map(id => new mongoose.Types.ObjectId(id));

    const perfumes = await PerfumeNotes.aggregate([
      {
        $match: { note_id: { $in: objectIds } }
      },
      {
        $group: {
          _id: "$perfume_id",
          matchedNotes: { $addToSet: "$note_id" }
        }
      },
      {
        $match: {
          $expr: {
            $eq: [{ $size: "$matchedNotes" }, noteIds.length]
          }
        }
      },
      {
        $lookup: {
          from: "perfumes", // 👈 Burada kesin string yazıyoruz
          localField: "_id",
          foreignField: "_id",
          as: "perfume"
        }
      },
      { $unwind: "$perfume" },
      { $replaceRoot: { newRoot: "$perfume" } },
      {
        $project: {
            _id: 1,
            brand: 1,
            name: 1,
            image_url: 1
        }
      }
    ]);

    res.json(Response.successResponse(perfumes));
  } catch (err) {
    console.error("Aggregation error:", err);
    const errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/filter', async(req, res) => {
    try {
        const { brands, genders, concentrations } = req.body;

        let filter = {};

        if (brands && brands.length > 0) {
            filter.brand = { $in: brands };
        }

        if (genders && genders.length > 0) {
            filter.gender = { $in: genders };
        }

        if (concentrations && concentrations.length > 0) {
            filter.concentration_id = { $in: concentrations };
        }

        const perfumes = await Perfumes.find(filter).select("_id brand name image_url");

        res.json(Response.successResponse({success: true, data: perfumes}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
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
        if(!body.gender) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "gender field must be filled");
        }
        if(!body.image_url) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.BAD_REQUEST, "image_url field must be filled");
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
            brand: body.brand,
            gender: body.gender
        });

        await perfume.save();

        for(const note of body.notes) {
            if(!note.note_id) {
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
            note_id: note.note_id,
            note_type: note.note_type
            });
            await perfumeNotes.save();
        }

        res.json(Response.successResponse({success: true, data: perfume}));

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
                    if(!note.note_id) {
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
                        note_id: note.note_id,
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

        if(body.gender) {
            updatesPerfume.gender = body.gender;
        }

        if(body.brand) {
            updatesPerfume.brand = body.brand;
        }
        
        const updated = await Perfumes.findByIdAndUpdate(body._id, updatesPerfume, {new: true});

        if (!updated) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.VALIDATION_ERROR, "Parfume not found");
        }

        res.json(Response.successResponse({success: true, data: updated}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', async (req, res) => {
    try{
        const perfumeId = req.params.id;
        const deleted = await Perfumes.deleteOne({_id: perfumeId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "perfume not found or already deleted");
        }

        await PerfumeNotes.deleteMany({perfume_id: perfumeId});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;