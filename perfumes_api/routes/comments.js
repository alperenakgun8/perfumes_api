var express = require('express');
var router = express.Router();

const Comments = require('../db/models/Comments');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');

router.get('/', async (req, res) => {
    try{
        let comments = await Comments.find({});
        res.json(Response.successResponse(comments));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.post('/add', async (req, res) => {
    let body = req.body;
    try{
        if(!body.user_id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "user_id field must be filled");
        }

        if(!body.perfume_id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "perfume_id field must be filled");
        }

        if(!body.content || body.content.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "content field must be filled");
        }

        let comment = new Comments({
            user_id: body.user_id,
            perfume_id: body.perfume_id,
            content: body.content,
            parent_comment_id: body.parent_comment_id || null,
            rating: body.rating || null
        });

        await comment.save();

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

        if(body.user_id) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, "Not Acceptable", "user_id cannot be changed!!!");
        }
        if(body.perfume_id) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, "Not Acceptable", "perfume_id cannot be changed!!!");
        }
        if(body.content) {
            updates.content = body.content; 
        }
        if(body.hasOwnProperty("parent_comment_id")) {
            updates.parent_comment_id = body.parent_comment_id; 
        }
        if(body.hasOwnProperty("rating")) {
            updates.rating = body.rating; 
        }

        const updated = await Comments.updateOne({_id: body._id}, updates);

        if(updated.matchedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Comment not found");
        }

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

        const deleted = await Comments.deleteOne({_id: body._id});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Comment not found or already deleted");
        }

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;