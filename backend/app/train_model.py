import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from core.cardio_model import CardioModel

model = CardioModel(model_dir="models")
model.train("data/cardio_train.csv")
