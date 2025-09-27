const mongoose = require("mongoose");

const schema = mongoose.Schema({
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: "users", required: true},
    perfume_id: {type: mongoose.Schema.Types.ObjectId, ref: "perfumes", required: true},
    content: {type: String, required: true},
    rating: {type: Number, required: true, min: [0, 'rating must between 0 and 5'], max: [5, 'rating must between 0 and 5'], validate:{validator: Number.isInteger, message: 'rating must be an integer'}},
    parent_comment_id: String
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class Comments extends mongoose.Model {

}

schema.loadClass(Comments);
module.exports = mongoose.model("comments", schema);