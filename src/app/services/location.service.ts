import { Injectable } from '@angular/core';
import { Location, isEnabled, enableLocationRequest, getCurrentLocation } from '@nativescript/geolocation';
import { knownFolders, File, path } from '@nativescript/core/file-system';
import { Application, Utils } from '@nativescript/core';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private locations: Array<{ latitude: number, longitude: number, address?: string }> = [];

  constructor() {
    this.loadFromFile();
  }

  async getCurrentLocation() {
    if (!await isEnabled()) {
      await enableLocationRequest();
    }

    return getCurrentLocation({
      desiredAccuracy: 3,
      updateDistance: 0.1,
      maximumAge: 5000,
      timeout: 20000
    });
  }

  saveLocation(latitude: number, longitude: number, address?: string) {
    this.locations.push({ latitude, longitude, address });
    this.saveToFile();
    this.saveToPublicFile();
  }

  private saveToFile() {
    const documents = knownFolders.documents();
    const file = documents.getFile('locations.json');
    file.writeText(JSON.stringify(this.locations));
  }

  loadFromFile() {
    const documents = knownFolders.documents();
    const filePath = path.join(documents.path, 'locations.json');

    if (File.exists(filePath)) {
      const file = File.fromPath(filePath);
      file.readText()
        .then(content => {
          this.locations = JSON.parse(content);
        });
    }
  }

  getLocations() {
    return this.locations;
  }

  clearLocations() {
    this.locations = [];
    this.saveToFile();
    this.saveToPublicFile();
  }

  deleteLocation(index: number) {
    this.locations.splice(index, 1);
    this.saveToFile();
    this.saveToPublicFile();
  }

  saveToPublicFile() {
    const context = Utils.android.getApplicationContext();
    const contentResolver = context.getContentResolver();
    const fileName = 'locations.txt';

    // Delete the existing file if it exists
    this.deletePublicFileIfExists(fileName);

    const values = new android.content.ContentValues();
    values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName);
    values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "text/plain");
    values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOCUMENTS);

    const uri = contentResolver.insert(android.provider.MediaStore.Files.getContentUri("external"), values);

    if (uri != null) {
      try {
        const outputStream = contentResolver.openOutputStream(uri);
        outputStream.write(new java.lang.String(JSON.stringify(this.locations)).getBytes());
        outputStream.close();
        console.log('File saved successfully to', fileName);
      } catch (err) {
        console.error('Error saving file', err);
      }
    }
  }

  readFromPublicFile() {
    const context = Utils.android.getApplicationContext();
    const contentResolver = context.getContentResolver();
    const fileName = 'locations.txt';

    const uri = android.provider.MediaStore.Files.getContentUri("external");
    const selection = android.provider.MediaStore.MediaColumns.DISPLAY_NAME + "=?";
    const selectionArgs = [fileName];

    const cursor = contentResolver.query(uri, null, selection, selectionArgs, null);

    if (cursor != null && cursor.moveToFirst()) {
      const id = cursor.getInt(cursor.getColumnIndexOrThrow(android.provider.MediaStore.MediaColumns._ID));
      const fileUri = android.net.Uri.withAppendedPath(uri, id.toString());

      try {
        const inputStream = contentResolver.openInputStream(fileUri);
        const content = this.convertStreamToString(inputStream);
        this.locations = JSON.parse(content);
        inputStream.close();
      } catch (err) {
        console.error('Error reading file', err);
      }
    }

    if (cursor != null) {
      cursor.close();
    }
  }

  private deletePublicFileIfExists(fileName: string) {
    const context = Utils.android.getApplicationContext();
    const contentResolver = context.getContentResolver();

    const uri = android.provider.MediaStore.Files.getContentUri("external");
    const selection = android.provider.MediaStore.MediaColumns.DISPLAY_NAME + "=?";
    const selectionArgs = [fileName];

    const cursor = contentResolver.query(uri, null, selection, selectionArgs, null);

    if (cursor != null && cursor.moveToFirst()) {
      const id = cursor.getInt(cursor.getColumnIndexOrThrow(android.provider.MediaStore.MediaColumns._ID));
      const fileUri = android.net.Uri.withAppendedPath(uri, id.toString());
      contentResolver.delete(fileUri, null, null);
      console.log('Existing file deleted:', fileName);
    }

    if (cursor != null) {
      cursor.close();
    }
  }

  private convertStreamToString(inputStream: java.io.InputStream): string {
    const s = new java.util.Scanner(inputStream).useDelimiter("\\A");
    return s.hasNext() ? s.next() : "";
  }
}
