const mongoose = require("mongoose");

const schema = mongoose.Schema({
    user_id: {type: String, required: true},
    perfume_id: {type: String, required: true}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

schema.index(({user_id: 1, perfume_id: 1}, {unique: true}));

class UserFavorites extends mongoose.Model {

}

schema.loadClass(UserFavorites);
module.exports = mongoose.model("user_favorites", schema);