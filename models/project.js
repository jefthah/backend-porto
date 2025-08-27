// models/project.js
import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    githubRepo: { type: String, default: '' },
    deployLink: { type: String, default: '' },
    imageUrl: { type: String, default: '' }, // contoh: /uploads/123.png
  },
  { timestamps: true, collection: 'projects' }
);

export default mongoose.model('Project', projectSchema);
