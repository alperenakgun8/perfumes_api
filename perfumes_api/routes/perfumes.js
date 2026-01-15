const express = require('express');
const router = express.Router();

const AuditLogs = require('../lib/AuditLogs');
const Perfumes = require('../db/models/Perfumes');
const emitter = require("../lib/Emitter");

const ExcelExport = require("../lib/Export");
const fs = require("fs");
const path = require("path");

const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const PerfumeNotes = require('../db/models/PerfumeNotes');
const mongoose = require("mongoose");
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();
const config = require('../config');
const I18n = require("../lib/i18n");
const i18n = new I18n(config.DEFAULT_LANG);

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
});

router.get('/general_info', async (req,res) => {
    try{
        let perfumes = await Perfumes.find({}).select("_id name brand image_url");
        res.json(Response.successResponse(perfumes));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/detail/:id', async (req, res) => {
    try{
        const perfumeId = req.params.id;

        const lang = req.user?.language || config.DEFAULT_LANG;

        if(!mongoose.Types.ObjectId.isValid(perfumeId)) {
            return res.status(Enum.HTTP_CODES.BAD_REQUEST).json(Response.errorResponse({code: Enum.HTTP_CODES.BAD_REQUEST, message: i18n.translate("COMMON.INVALID", lang, ["perfume_id"])}));
        }

        let perfume = await Perfumes.findById(perfumeId).populate('concentration_id', 'name display_name');

        if(!perfume) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: i18n.translate("COMMON.NOT_FOUND", lang, ["Perfume"])}));
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

router.post('/filter_by_notes', async (req, res) => {
  try {

    const { noteIds } = req.body;

    const lang = req.user?.language || config.DEFAULT_LANG;

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.VALIDATION_ERROR_TITLE", lang), i18n.translate("COMMON.MUST_BE_NON_EMPTY_ARRAY", lang, ["noteIds"]));
    }

    const objectIds = noteIds.map(id => new mongoose.Types.ObjectId(String(id)));

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
          from: "perfumes",
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
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.post('/add', auth.checkRoles("perfume_add"), async (req, res) => {

    try{

        let body = req.body;

        if(!body.name) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["name"]));
        }
        if(!body.description) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["description"]));
        }
        if(!body.concentration_id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["concentration_id"]));
        }
        if(!body.brand){
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["brand"]));
        }
        if(!body.gender) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["gender"]));
        }
        if(body.gender !== "Kadın" && body.gender && "Erkek" && body.gender !== "Unisex") {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE", req.user.language, ["gender", "Kadın | Erkek | Unisex"]));
        }
        if(!body.image_url) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["image_url"]));
        }
        if(!body.notes) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["notes"]));
        }
        if(!Array.isArray(body.notes) || body.notes.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.MUST_BE_NON_EMPTY_ARRAY", req.user.language, ["notes"]));
        }

        let perfume = new Perfumes({
            name: body.name,
            description: body.description,
            image_url: body.image_url || "",
            concentration_id: body.concentration_id,
            brand: body.brand,
            gender: body.gender,
            created_by: req.user._id
        });

        await perfume.save();

        for(const note of body.notes) {
            if(!note.note_id) {
                await Perfumes.deleteOne({_id: perfume._id});
                throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["notes -> _id"]));
            }
            if(!note.note_type) {
                await Perfumes.deleteOne({_id: perfume._id});
                throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["notes -> note_type"]));
            }
            if(note.note_type !== "TOP" && note.note_type !== "MIDDLE" && note.note_type !== "BASE") {
                await Perfumes.deleteOne({_id: perfume._id});
                throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["notes -> note_type 'TOP' | 'MIDDLE' 'BASE'"]));
            }
            let perfumeNotes = new PerfumeNotes({
            perfume_id: perfume._id,
            note_id: note.note_id,
            note_type: note.note_type
            });
            await perfumeNotes.save();
        }

        AuditLogs.info(req.user.email, "Perfumes", "Add", perfume);
        logger.info(req.user.email, "Perfumes", "Add", perfume);
        emitter.getEmitter("notifications").emit("messages", {message: "perfume added."});

        res.json(Response.successResponse({success: true, data: perfume}));

    } catch (err) {
        logger.error(req.user.email, "Perfumes", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', auth.checkRoles("perfume_update"), async (req, res) => {

    try {

        let body = req.body;

        if(!body._id){
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["_id"]));
        }

        const before = await Perfumes.findById(body._id);

        if (!before) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND", req.user.language, ["Perfume"]));
        }

        if(body.name && body.concentration_id) {
            let finded = await Perfumes.findOne({name: body.name, concentration_id: body.concentration_id});
            if(finded) {
                throw new CustomError(Enum.HTTP_CODES.CONFLICT, i18n.translate("COMMON.ALREADY_EXIST", req.user.language, [""]), i18n.translate("COMMON.ALREADY_EXIST", req.user.language, ["Perfume"]));
            }
        }

        if(body.notes) {
            if(!Array.isArray(body.notes) || body.notes.length === 0) {
                throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.MUST_BE_NON_EMPTY_ARRAY", req.user.language, ["notes"]));
            } else {
                await PerfumeNotes.deleteMany({perfume_id: body._id});
                for(const note of body.notes) {
                    if(!note.note_id) {
                        throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["notes -> _id"]));
                    }
                    if(!note.note_type) {
                        throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["notes -> note_type"]));
                    }
                    if(note.note_type !== "TOP" && note.note_type !== "MIDDLE" && note.note_type !== "BASE") {
                        throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, i18n.translate("COMMON.BAD_REQUEST", req.user.language), i18n.translate("COMMON.FIELD_MUST_BE_FILLED", req.user.language, ["notes -> note_type 'TOP' | 'MIDDLE' 'BASE'"]));
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

        AuditLogs.info(req.user.email, "Perfumes", "Update", {before: before, after: updated});
        logger.info(req.user.email, "Perfumes", "Update", {before: before, after: updated});
        emitter.getEmitter("notifications").emit("messages", {message: "perfume updated."});

        res.json(Response.successResponse({success: true, data: updated}));

    } catch (err) {
        logger.error(req.user.email, "Perfumes", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', auth.checkRoles("perfume_delete"), async (req, res) => {
    try{
        const perfumeId = req.params.id;

        const perfume = await Perfumes.findById(perfumeId);

        if(!perfume) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, i18n.translate("COMMON.NOT_FOUND", req.user.language, [""]), i18n.translate("COMMON.NOT_FOUND_OR_ALREADY_DELETED", req.user.language, ["Perfume"]));
        }

        await PerfumeNotes.deleteMany({perfume_id: perfumeId});

        await Perfumes.deleteOne({_id: perfumeId});

        AuditLogs.info(req.user.email, "Perfumes", "Delete", perfume);
        logger.error(req.user.email, "Perfumes", "Delete", perfume);
        emitter.getEmitter("notifications").emit("messages", {message: "perfume deleted."});

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user.email, "Perfumes", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.get("/export", auth.checkRoles("perfume_export"), async (req, res) => {
    try{
        let perfumes = await Perfumes.find({}).populate("created_by", "email").populate("concentration_id", "name");

        const formattedData = perfumes.map(p => ({
            brand: p.brand,
            name: p.name,
            description: p.description,
            concentration: p.concentration_id ? p.concentration_id.name : "N/A",
            gender: p.gender,
            created_by: p.created_by ? p.created_by.email : "N/A",
            created_at: p.created_at,
            image_url: p.image_url
        }));

        let excelTable = ExcelExport.toExcel(
        ["BRAND", "NAME", "DESCRIPTION", "CONCENTRATION", "GENDER", "CREATED_BY", "CREATED_AT", "IMAGE_URL"],
        ["brand", "name", "description", "concentration", "gender", "created_by", "created_at", "image_url"],
        formattedData
        );

        let filePath = path.join(config.EXCEL_TMP_PATH, `perfumes_excel_${Date.now()}.xlsx`);
        
        fs.writeFileSync(filePath, excelTable, "UTF-8");
        res.download(filePath, () => {
            fs.unlinkSync(filePath);
        });

        AuditLogs.info(req.user.email, "Perfumes", "Export Excel", "exported");
        logger.info(req.user.email, "Perfumes", "Export Excel", "exported");
        emitter.getEmitter("notifications").emit("messages", {message: "perfume exported."});

    } catch (err) {
        logger.error(req.user.email, "Perfumes", "Export Excel", err);
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;