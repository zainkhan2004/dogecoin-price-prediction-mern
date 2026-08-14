# Reference files

These files are preserved from the original student project for provenance and comparison:

- `original_streamlit_app.py` — original Streamlit implementation.
- `dogecoin_model.pkl` — supplied scikit-learn Linear Regression model.
- `original_package.json` — original JavaScript package manifest that was supplied with the project.

The runtime MERN application does not load the Python pickle directly. Its coefficients were extracted into `backend/src/services/model.js` so the application can run without Python.
