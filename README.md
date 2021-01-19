# pong2108physics
Physics engine for 2108

This is the physics engine for the Pong-2180 app.  This "engine" spools up and just keeps doing the calculations for the location of the ball.
It calculates acceleration using basic rectilinear physics equation.  It accelerates the ball and then it flies at a constant velocity to the final location. While in flight, it calculates the the location on a earth longitudinal and latitude location and then calculates the distance, then converts to GPS location.  This GPS location is then sent to the front end which uses this to plot the ball location.

Written by Rich Budek using engineering equations on a project with others.

