import os
import pymongo
from pymongo import MongoClient
from dalle_mini.model import DalleMini, DalleBartProcessor
from PIL import Image
import torch

# INPUT_REQUIRED {MongoDB connection string} - Set your MongoDB connection string here
MONGO_URI = "mongodb+srv://user:user@cluster0.8wuam9k.mongodb.net/Cluster0?retryWrites=true&w=majority"
DB_NAME = "the_terrible_teddies"
COLLECTION_NAME = "teddies"

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# Initialize DALL-E Mini
model = DalleMini.from_pretrained("dalle-mini/dalle-mini/mega-1-fp16:latest")
processor = DalleBartProcessor.from_pretrained("dalle-mini/dalle-mini/mega-1-fp16:latest")

def generate_image(prompt):
    try:
        inputs = processor([prompt], return_tensors="pt")
        images = model.generate_images(inputs)
        return images[0]
    except Exception as e:
        print(f"Error generating image for prompt '{prompt}': {e}")
        raise

def save_image(image, path):
    try:
        image.save(path)
    except Exception as e:
        print(f"Error saving image to '{path}': {e}")
        raise

def main():
    try:
        teddies = collection.find({})
        for teddy in teddies:
            prompt = teddy["name"]
            print(f"Generating image for: {prompt}")
            image = generate_image(prompt)
            image_path = os.path.join("./public/assets/images", f"{prompt.replace(' ', '_').lower()}.png")
            save_image(image, image_path)
            print(f"Image saved at: {image_path}")
    except Exception as e:
        print(f"Error in main function: {e}")
        raise
    finally:
        client.close()
        print("MongoDB connection closed")

if __name__ == "__main__":
    main()