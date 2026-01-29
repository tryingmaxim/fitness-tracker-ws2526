import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  constructor(private readonly authService: AuthService) {}

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    this.authService.logout();
  }
}
