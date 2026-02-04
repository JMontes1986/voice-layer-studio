import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Pipe({
  name: 'blob',
  standalone: true
})
export class BlobPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(blob: Blob | null): SafeUrl | null {
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}
