import { Component, OnInit } from '@angular/core';
import { LocationService } from './services/location.service';
import { HttpClient } from '@angular/common/http';
import { isAndroid } from '@nativescript/core';
import * as permissions from 'nativescript-permissions';

@Component({
  selector: 'ns-app',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  latitude: number;
  longitude: number;
  address: string = '';
  locations: Array<{ latitude: number, longitude: number, address?: string }> = [];

  constructor(private locationService: LocationService, private http: HttpClient) {}

  ngOnInit(): void {
    this.requestPermissions();
    this.locationService.loadFromFile();
    this.locations = this.locationService.getLocations();
  }

  async saveLocation() {
    const location = await this.locationService.getCurrentLocation();
    this.latitude = location.latitude;
    this.longitude = location.longitude;
    this.locationService.saveLocation(this.latitude, this.longitude, this.address);
    this.locations = this.locationService.getLocations();
  }

  async pushToDatabase() {
    const apiUrl = 'https://rocky-bayou-84476-79654ba4af58.herokuapp.com/locations';
    console.log('Pushing locations to database:', this.locations);
  
    const formattedLocations = this.locations.map(loc => ({
      latitude: loc.latitude.toString(),
      longitude: loc.longitude.toString(),
      address: loc.address
    }));
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedLocations)
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.text();
      console.log('Locations pushed to database', result);
      this.locationService.clearLocations();
      this.locations = [];
    } catch (error) {
      console.error('Error pushing locations to database', error);
    }
  }

  deleteLocation(index: number) {
    this.locationService.deleteLocation(index);
    this.locations = this.locationService.getLocations();
  }

  openOrSaveFile() {
    if (isAndroid) {
      this.locationService.saveToPublicFile();
      this.locationService.readFromPublicFile();
    } else {
      console.log('iOS does not support this functionality in the same way as Android.');
    }
  }

  private requestPermissions() {
    if (isAndroid) {
      permissions.requestPermissions([
        android.Manifest.permission.WRITE_EXTERNAL_STORAGE,
        android.Manifest.permission.READ_EXTERNAL_STORAGE
      ]).then(() => {
        console.log("Permissions granted!");
      }).catch(() => {
        console.log("Permissions denied!");
      });
    }
  }
}
