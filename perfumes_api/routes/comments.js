const express = require('express');
const router = express.Router();

const Comments = require('../db/models/Comments');
const AuditLogs = require('../lib/AuditLogs');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();

router.get('/perfume/:id', async (req, res) => {
    try{
        const perfume_id = req.params.id;
        let comments = await Comments.find({perfume_id: perfume_id}).populate("user_id");

        if(!comments) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: "Perfume comments not found"}));
        }

        res.json(Response.successResponse(comments));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.all("*", auth.authenticate(), (req, res, next) => {
    next();
});

router.get('/', auth.checkRoles("comment_view"),async (req, res) => {
    try{
        let comments = await Comments.find({}).populate("user_id");
        res.json(Response.successResponse(comments));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('user/:id', auth.checkRoles("comment_view_user"),async (req, res) => {
    try{
        const userId = req.params.id;
        let comments = await Comments.find({user_id: userId}).populate("user_id");

        if(!comments) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: "User comment not found"}));
        }

        res.json(Response.successResponse(comments));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.post('/add', auth.checkRoles("comment_add"), async (req, res) => {
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

        if(!body.rating) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "rating field must be filled");
        }

        let comment = new Comments({
            user_id: body.user_id,
            perfume_id: body.perfume_id,
            content: body.content,
            rating: body.rating,
        });

        await comment.save();

        const addedComment = await comment.populate("user_id");

        AuditLogs.info(req.user?.email, "Comments", "Add", comment);
        logger.info(req.user?.email, "Comments", "Add", comment);

        res.json(Response.successResponse({success: true, data: addedComment}));

    } catch (err) {
        logger.error(req.user?.email, "Comments", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', auth.checkRoles("comment_update"),async (req, res) => {
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
        if(body.rating) {
            updates.rating = body.rating; 
        }

        const updated = await Comments.updateOne({_id: body._id}, updates);

        if(updated.matchedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Comment not found");
        }

        AuditLogs.info(req.user?.email, "Comments", "Update", updated);
        logger.info(req.user?.email, "Comments", "Update", updated);

        const updatedComment = await updated.populate("user_id");

        res.json(Response.successResponse({success: true, data: updatedComment}));

    } catch (err) {
        logger.error(req.user?.email, "Comments", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', auth.checkRoles("comment_delete"),async (req, res) => {
    try{
        let commentId = req.params.id;
        const deleted = await Comments.deleteOne({_id: commentId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Comment not found or already deleted");
        }

        AuditLogs.info(req.user?.email, "Comments", "Delete", deleted);
        logger.info(req.user?.email, "Comments", "Delete", deleted);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "Comments", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;