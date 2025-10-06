var express = require('express');
var router = express.Router();

const CommentsOfTopics = require("../db/models/CommentsOfTopics");
const AuditLogs = require("../lib/AuditLogs");
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');
const logger = require("../lib/logger/LoggerClass");
const auth = require("../lib/auth")();

router.get('/topic/:id', async (req, res) => {
    try{
        const topic_id = req.params.id;
        let comments = await CommentsOfTopics.find({topic_id: topic_id}).populate("user_id");

        if(comments.length === 0) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: "Topic comments not found"}));
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

router.get('/', auth.checkRoles("comment_of_topic_view"), async (req, res) => {
    try{
        let comments = await CommentsOfTopics.find({}).populate("user_id");
        res.json(Response.successResponse(comments));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/user/:id', auth.checkRoles("comment_of_topic_view_user"), async (req, res) => {
    try{
        const userId = req.params.id;
        let comments = await CommentsOfTopics.find({user_id: userId}).populate("user_id");

        if(comments.length === 0) {
            return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: "User comment not found"}));
        }

        res.json(Response.successResponse(comments));
    } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.post('/add', auth.checkRoles("comment_of_topic_add"), async (req, res) => {
    let body = req.body;
    try{
        if(!body.user_id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "user_id field must be filled");
        }

        if(!body.topic_id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "topic_id field must be filled");
        }

        if(!body.content || body.content.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "content field must be filled");
        }

        let comment = new CommentsOfTopics({
            user_id: body.user_id,
            topic_id: body.topic_id,
            content: body.content,
        });

        await comment.save();

        AuditLogs.info(req.user?.email, "CommentsOfTopics", "Add", comment);
        logger.info(req.user?.email, "CommentsOfTopics", "Add", comment);

        const addedComment = await comment.populate("user_id");

        res.json(Response.successResponse({success: true, data: addedComment}));

    } catch (err) {
        logger.error(req.user?.email, "CommentsOfTopics", "Add", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post('/update', auth.checkRoles("comment_of_topic_update"), async (req, res) => {
    let body = req.body;
    try{
        if(!body._id) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "_id field must be filed");
        }

        let updates = {};

        if(body.user_id) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, "Not Acceptable", "user_id cannot be changed!!!");
        }
        if(body.topic_id) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, "Not Acceptable", "topic_id cannot be changed!!!");
        }
        if(body.content) {
            updates.content = body.content; 
        }
        const updated = await CommentsOfTopics.updateOne({_id: body._id}, updates);

        if(updated.matchedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Comment not found");
        }

        const updatedComment = await CommentsOfTopics.findById(body._id).populate("user_id");

        AuditLogs.info(req.user?.email, "CommentsOfTopics", "Update", updated);
        logger.info(req.user?.email, "CommentsOfTopics", "Update", updated);

        res.json(Response.successResponse({success: true, data: updatedComment}));

    } catch (err) {
        logger.error(req.user?.email, "CommentsOfTopics", "Update", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', auth.checkRoles("comment_of_topic_delete"), async (req, res) => {
    try{
        let commentId = req.params.id;
        const deleted = await CommentsOfTopics.deleteOne({_id: commentId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "Comment not found or already deleted");
        }

        AuditLogs.info(req.user?.email, "CommentsOfTopics", "Delete", deleted);
        logger.info(req.user?.email, "CommentsOfTopics", "Delete", deleted);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        logger.error(req.user?.email, "CommentsOfTopics", "Delete", err);
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

module.exports = router;