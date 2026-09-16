"""
Simple CNN Training Script
Diagnosa pipeline training pneumonia detection
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization, Input
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam


def build_simple_cnn(img_size=(224, 224)):
    inputs = Input(shape=(img_size[0], img_size[1], 3))
    x = Conv2D(32, (3,3), activation='relu', padding='same')(inputs)
    x = MaxPooling2D((2,2))(x)
    x = BatchNormalization()(x)
    x = Conv2D(64, (3,3), activation='relu', padding='same')(x)
    x = MaxPooling2D((2,2))(x)
    x = BatchNormalization()(x)
    x = Conv2D(128, (3,3), activation='relu', padding='same')(x)
    x = MaxPooling2D((2,2))(x)
    x = BatchNormalization()(x)
    x = Flatten()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.5)(x)
    outputs = Dense(1, activation='sigmoid')(x)
    model = Model(inputs, outputs)
    model.compile(optimizer=Adam(1e-3), loss='binary_crossentropy', metrics=['accuracy'])
    return model

def create_generators(data_dir, img_size=(224,224), batch_size=32):
    datagen = ImageDataGenerator(rescale=1./255)
    train_gen = datagen.flow_from_directory(
        os.path.join(data_dir, 'train'),
        target_size=img_size,
        batch_size=batch_size,
        class_mode='binary',
        shuffle=True
    )
    val_gen = datagen.flow_from_directory(
        os.path.join(data_dir, 'val'),
        target_size=img_size,
        batch_size=batch_size,
        class_mode='binary',
        shuffle=False
    )
    test_gen = datagen.flow_from_directory(
        os.path.join(data_dir, 'test'),
        target_size=img_size,
        batch_size=batch_size,
        class_mode='binary',
        shuffle=False
    )
    return train_gen, val_gen, test_gen


def plot_history(history):
    plt.figure(figsize=(12,5))
    plt.subplot(1,2,1)
    plt.plot(history.history['accuracy'], label='Train')
    plt.plot(history.history['val_accuracy'], label='Val')
    plt.title('Accuracy')
    plt.legend()
    plt.subplot(1,2,2)
    plt.plot(history.history['loss'], label='Train')
    plt.plot(history.history['val_loss'], label='Val')
    plt.title('Loss')
    plt.legend()
    plt.tight_layout()
    plt.savefig('simple_cnn_history.png')
    plt.show()

def main():
    data_dir = '../data'
    if not os.path.exists(data_dir):
        print('Data directory not found!')
        return
    print('Membuat generator...')
    train_gen, val_gen, test_gen = create_generators(data_dir)
    print('Membuat model...')
    model = build_simple_cnn()
    print(model.summary())
    print('Training...')
    history = model.fit(
        train_gen,
        epochs=20,
        validation_data=val_gen
    )
    model.save('../models/pneumonia_simple_cnn.h5')
    print('Model saved as ../models/pneumonia_simple_cnn.h5')
    plot_history(history)

    print('Evaluasi di test set:')
    loss, acc = model.evaluate(test_gen)
    print(f'Test accuracy: {acc:.2%}')

if __name__ == '__main__':
    main()
