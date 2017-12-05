import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HeroesComponent } from './heroes/heroes.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes:Routes  = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full'}, //go to dashboard by default
  { path: 'heroes', component: HeroesComponent }, //equivalent to using selector for heroes component in the HTML
  { path: 'dashboard', component: DashboardComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  //makes router directives available for use in AppModule components that will need them
  exports: [ RouterModule ], 
})
export class AppRoutingModule { }
