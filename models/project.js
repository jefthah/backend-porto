// models/project.js
import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    techStack: [{ type: String }],
    githubRepo: { type: String, default: '' },
    deployLink: { type: String, default: '' },
    demoVideoUrl: { type: String, default: '' },
    imageUrl: { type: String, default: '' }, 
  },
  { timestamps: true, collection: 'projects' }
);

export default mongoose.model('Project', projectSchema);
