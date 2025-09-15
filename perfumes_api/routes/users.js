var express = require('express');
var router = express.Router();

const is = require("is_js");
const bcrypt = require("bcrypt-nodejs");

const Users = require('../db/models/Users');
const UserFavorites = require('../db/models/UserFavorites');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');

router.get('/', async (req, res) => {
    try{
        let users = await Users.find({});
        res.json(Response.successResponse(users));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('./:id', async (req, res) => {
  try{
    const userId = req.params.id;
    let user = await Users.findOne({_id: userId});

    if(!user) {
      return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: "User not found"}));
    }

    res.json(Response.successResponse(user));
    
  } catch(err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/add', async (req, res) => {
    let body = req.body;
    try{
        if(!body.email || body.email.length === 0) {
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "email field must be filled");
        }

        if(!is.email(body.email)) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "email has to be email format");
        }

        if(!body.password || body.password.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "password field must be filled");
        }

        if(body.password.length < Enum.MIN_PASSWORD_LENGTH || body.password.length > Enum.MAX_PASSWORD_LENGTH) {
          throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, Enum.NOT_ACCEPTABLE_TEXT, "password length has to be between 8-16 characters");
        }

        if(!body.first_name || body.first_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "first_name field must be filled");
        }

        if(!body.last_name || body.last_name.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "last_name field must be filled");
        }
         
        let finded = await Users.find({email: body.email});

        if(finded.length > 0) {
            throw new CustomError(Enum.HTTP_CODES.CONFLICT, Enum.VALIDATION_ERROR, "User already exists");
        }

        let hashedPassword = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);

        let user = new Users({
            email: body.email,
            password: hashedPassword,
            first_name: body.first_name,
            last_name: body.last_name
        });

        await user.save();

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
            throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "_id field must be filled");
        }

        let user = await Users.findOne({_id: body._id});

        if(!user) {
          throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "User not found");
        }

        if(body.email) {
          throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, Enum.NOT_ACCEPTABLE_TEXT, "email cannot be changed");
        }

        let updates = {};

        if(body.password) {
          if(bcrypt.compareSync(body.password, user.password)) {
            throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, Enum.NOT_ACCEPTABLE_TEXT, "new password cannot be same with previous password");
          } else {
             let hashedPassword = bcrypt.hashSync(body.password, bcrypt.genSaltSync(8), null);
             updates.password = hashedPassword;
          }
        }

        if(body.first_name) {
          updates.first_name = body.first_name;
        }

        if(body.last_name) {
          updates.last_name = body.last_name;
        }

        await Users.updateOne({_id: body._id}, updates);

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.delete('/:id', async (req, res) => {
    try{
        const userId = req.params.id; 
        const deleted = await Users.deleteOne({_id: userId});

        if(deleted.deletedCount === 0) {
            throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "User not found or already deleted");
        }

        res.json(Response.successResponse({success: true}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.get('/favorites', async (req, res) => {
  try{
    let favorites = await UserFavorites.find({});
    res.json(Response.successResponse(favorites));
  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(errorResponse.code).json(errorResponse);
  }
});

router.post('/favorites/add', async (req, res) => {
  let body = req.body;
  try{
    if(!body.user_id) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "user_id field must be filled");
    }

    if(!body.perfume_id) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "perfume_id field must be filled");
    }

    let finded = await UserFavorites.findOne({user_id: body.user_id, perfume_id: body.perfume_id});
    
    if(finded) {
      throw new CustomError(Enum.HTTP_CODES.NOT_ACCEPTABLE, Enum.NOT_ACCEPTABLE_TEXT, "Perfume already added to user favorites");
    }

    let favorite = new UserFavorites({
      user_id: body.user_id,
      perfume_id: body.perfume_id
    });

    await favorite.save();

    res.json(Response.successResponse({success: true}));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

router.delete('/favorites/:id', async (req, res) => {
  try {
    const favoriteId = req.params.id;
    const deleted = await UserFavorites.deleteOne({_id: favoriteId});

    if(deleted.deletedCount === 0) {
      throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "favorite parfum not found or already deleted");
    }

    res.json(Response.successResponse({success: true}));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

module.exports = router;
