const express = require('express');
const router = express.Router();
const multer = require("multer");
const path = require("path");

const is = require("is_js");
const bcrypt = require("bcrypt-nodejs");

const Users = require('../db/models/Users');
const UserFavorites = require('../db/models/UserFavorites');
const CustomError = require('../lib/Error');
const Response = require('../lib/Response');
const Enum = require('../config/enum');

router.get('/', async (req, res) => {
    try{
        let users = await Users.find({}).select("-password");
        res.json(Response.successResponse(users));
    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(errorResponse.code).json(errorResponse);
    }
});

router.get('/:id', async (req, res) => {
  try{
    const userId = req.params.id;
    let user = await Users.findOne({_id: userId});

    if(!user) {
      return res.status(Enum.HTTP_CODES.NOT_FOUND).json(Response.errorResponse({code: Enum.HTTP_CODES.NOT_FOUND, message: "User not found"}));
    }

    const userObj = user.toObject();
    delete userObj.password;

    res.json(Response.successResponse(userObj));
    
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

        if(!body.nickname || body.nickname.length === 0) {
          throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "nickname field must be filled");
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
            last_name: body.last_name,
            nickname: body.nickname
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

        if(body.first_name) {
          updates.first_name = body.first_name;
        }

        if(body.last_name) {
          updates.last_name = body.last_name;
        }

        if(body.nickname) {
          updates.nickname = body.nickname;
        }

        const updated = await Users.findByIdAndUpdate(body._id, updates, {new: true});

        res.json(Response.successResponse({success: true, data: updated}));

    } catch (err) {
        let errorResponse = Response.errorResponse(err);
        res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
    }
});

router.post("/getuser", async (req, res) => {
  const {email, password} = req.body;
  try{
    if(!email) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "email field must be filled");
    }
    if(!password){
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "password field must be filled");
    }

    const user = await Users.findOne({email: email});
    if(!user){
      return res.json(Response.successResponse({success: false, message: "User with email not found"}));
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if(err) throw err;

      if(!result) {
        return res.json(Response.successResponse({success: false, message: "invalid password"}));
      }

      const { password: pwd, ...userObj } = user.toObject();
      const isAdmin = user.role === "Admin";
      const isSuperAdmin = user.role === "Super Admin";

      res.json(Response.successResponse({success: true, data: {user: userObj, is_admin: isAdmin, is_super_admin: isSuperAdmin,  success: true}}));
    });

  } catch (err) {
    const errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

router.post('/updatepassword', async (req, res) => {
  try{
    const{ user_id, old_password, new_password } = req.body;

    if(!user_id) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "user_id field must be filled");
    }
    if(!old_password) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "old_password field must be filled");
    }
    if(!new_password){
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "new_password field must be filled");
    }

    const user = await Users.findById(user_id).select("password");
    if (!user) {
      return res.json(Response.successResponse({ success: false, message: "User not found" }));
    }

    bcrypt.compare(old_password, user.password, async (err, result) => {
      if (err) throw err;

      if(!result) {
        return res.json(Response.successResponse({success: false, message: "does not matched old_password"}));
      }

       if(new_password.length < Enum.MIN_PASSWORD_LENGTH || new_password.length > Enum.MAX_PASSWORD_LENGTH) {
      return res.json(Response.successResponse({ success: false, message: "password length must be in 8-16"}))
    }

    let hashedNewPassword = bcrypt.hashSync(new_password, bcrypt.genSaltSync(8), null);

    user.password = hashedNewPassword
    await user.save();

    return res.json(Response.successResponse({ success: true, message: "Password updated successfully"}));
    });

  } catch (err) {
    console.log(err);
    const errorResponse = Response.errorResponse(err);
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

router.post('/favorites', async (req, res) => {
  try {
    const { user_id } = req.body;
    let favorites = await UserFavorites.find({ user_id })
      .populate("perfume_id", "_id brand name image_url");

    // sadece perfume_id’leri al
    const perfumes = favorites.map(fav => fav.perfume_id);

    res.json(Response.successResponse({success: true, data: perfumes}));
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

    const populated = await favorite.populate("perfume_id", "_id name brand image_url");

    res.json(Response.successResponse({success: true, data: populated.perfume_id}));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

router.post('/favorites/delete', async (req, res) => {
  try {
    const {user_id, perfume_id} = req.body;
    const deleted = await UserFavorites.deleteOne({user_id: user_id, perfume_id: perfume_id});

    if(deleted.deletedCount === 0) {
      throw new CustomError(Enum.HTTP_CODES.NOT_FOUND, Enum.NOT_FOUND, "favorite parfum not found or already deleted");
    }

    res.json(Response.successResponse({success: true}));

  } catch (err) {
    let errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random()* 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post("/uploadProfilePic/:id", upload.single("profilePic"), async(req, res) => {
  try {
    const userId = req.params.id;

    if(!req.file) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "file cannot upload");
    }

    console.log("req.params.id:", req.params.id);
    console.log("req.file:", req.file);

    const imagePath = `/uploads/${req.file.filename}`;

    const user = await Users.findByIdAndUpdate(
      userId,
      { profile_picture: imagePath},
      { new: true }
    );

    if(!user) {
      throw new CustomError(Enum.HTTP_CODES.BAD_REQUEST, Enum.VALIDATION_ERROR, "user not found");
    }

    res.json(Response.successResponse({ success: true, message: "Profile picture updated", data: user }));

  } catch (err) {
    console.log("Catch Error: " , err);
    let errorResponse = Response.errorResponse(err);
    res.status(err.code || Enum.HTTP_CODES.INT_SERVER_ERROR).json(errorResponse);
  }
});

module.exports = router;
