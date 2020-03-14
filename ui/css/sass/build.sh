#!/bin/bash
sass master.scss:../volumio.css
sass --style=compressed master.scss:../volumio.min.css
