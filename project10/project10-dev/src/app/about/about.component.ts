import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {

  thingsLearned: String[] = [
    "creating Angular components to show data from a database of heroes",
    "using one-way data binding for read-only data and two-way binding for editable data",
    "binding components to user events",
    "creating an Angular service to handle CRUD operations for a mock hero database",
    "use Angular routing to navigate through the application"
  ]

  constructor() { }

  ngOnInit() {
  }

}
