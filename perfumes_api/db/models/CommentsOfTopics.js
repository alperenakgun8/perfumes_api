const mongoose = require("mongoose");

const schema = mongoose.Schema({
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: "users", required: true},
    topic_id: {type: mongoose.Schema.Types.ObjectId, ref: "topics", required: true},
    content: {type: String, required: true}
}, {
    versionKey: false,
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
});

class CommentsOfTopics extends mongoose.Model {

}

schema.loadClass(CommentsOfTopics);
module.exports = mongoose.model("comments_of_topics", schema);