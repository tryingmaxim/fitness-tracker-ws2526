import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

//Routing ermöglicht anzeigen verschiedener Unterseiten, abhängig von der URL
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {}
