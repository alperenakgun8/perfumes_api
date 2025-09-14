var express = require('express');
var router = express.Router();

const Perfumes = require('../db/models/Perfumes');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');

router.get('/', async (req, res) => {
    try{
        let perfumes = await Perfumes.find({});
        res.json(Response.successResponse(perfumes));
    } catch(err) {
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
    } catch (err) {

    }
})

module.exports = router;