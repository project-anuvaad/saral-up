package com.up_saraldata.scanner;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.media.MediaActionSound;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Base64;
import android.util.Log;
import android.view.SurfaceView;
import android.view.Window;
import android.view.WindowManager;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.up_saraldata.R;
import com.up_saraldata.hwmodel.DigitModel;
import com.up_saraldata.hwmodel.HWClassifier;
import com.up_saraldata.hwmodel.PredictionListener;
import com.up_saraldata.opencv.BlurDetection;
import com.up_saraldata.opencv.DetectShaded;
import com.up_saraldata.opencv.ExtractROIs;
import com.up_saraldata.opencv.TableCornerCirclesDetection;
import com.up_saraldata.prediction.PredictionFilter;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.opencv.android.BaseLoaderCallback;
import org.opencv.android.CameraBridgeViewBase;
import org.opencv.android.LoaderCallbackInterface;
import org.opencv.android.OpenCVLoader;
import org.opencv.android.Utils;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.core.Scalar;
import org.opencv.imgproc.Imgproc;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;

public class UPPATScannerActivity extends ReactActivity implements CameraBridgeViewBase.CvCameraViewListener2 {
    private static final String  TAG                    = "UP_Saral::UPPAT";
    private static long mframeCount                     = 0;
    private static long mIgnoreFrameCount               = 0;
    private static final int START_PROCESSING_COUNT     = 20;

    private boolean isHWClassiferAvailable              = true;
    private boolean isRelevantFrameAvailable            = false;
    private boolean mIsScanningComplete                 = false;
    private boolean mScanningResultShared               = false;

    private Mat                             mRgba;
    private CameraBridgeViewBase            mOpenCvCameraView;
    private TableCornerCirclesDetection     mTableCornerDetection;
    private ExtractROIs                     mROIs;
    private DetectShaded                    mDetectShaded;
    private BlurDetection                   blurDetection;
    private long                            mStartTime;
    private long                            mStartPredictTime;

    private int     mTotalClassifiedCount               = 0;
    private boolean mIsClassifierRequestSubmitted       = false;
    private HashMap<String, String> mPredictedDigits    = new HashMap<>();
    private HashMap<String, DigitModel> mPredictedDigitModel    = new HashMap<>();
    private HashMap<String, Mat> mPredictionMat    = new HashMap<>();
    private HashMap<String, String> mPredictedOMRs      = new HashMap<>();
    private HashMap<String, HashMap> mPredictedDigitModelArr     = new HashMap<>();

    private String[] rollNumberPool;

    private HWClassifier hwClassifier;

    private BaseLoaderCallback mLoaderCallback = new BaseLoaderCallback(this) {
        @Override
        public void onManagerConnected(int status) {
            switch (status) {
                case LoaderCallbackInterface.SUCCESS:
                {
                    Log.i(TAG, "OpenCV loaded successfully");
                    mOpenCvCameraView.enableView();
                } break;
                default:
                {
                    super.onManagerConnected(status);
                } break;
            }
        }
    };
    public UPPATScannerActivity() {
        Log.i(TAG, "Instantiated new " + this.getClass());
    }

    /** Called when the activity is first created. */
    @SuppressLint("SourceLockedOrientationActivity")
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.i(TAG, "called onCreate");
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_up_pat_scanner);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);

        mOpenCvCameraView = (CameraBridgeViewBase) findViewById(R.id.up_pat_scanner_activity_surface_view);
        mOpenCvCameraView.setVisibility(SurfaceView.VISIBLE);
        mOpenCvCameraView.setCvCameraViewListener(this);
        mOpenCvCameraView.setMaxFrameSize(1280,720);
        mOpenCvCameraView.enableFpsMeter();

        if (getIntent().hasExtra("NUMBER_POOL")) {
            try {
                Log.i(TAG, "NumberPool-String:" + getIntent().hasExtra("NUMBER_POOL"));
                JSONArray jsonArray = new JSONArray(getIntent().getStringExtra("NUMBER_POOL"));
                rollNumberPool = new String[jsonArray.length()];
                for (int i = 0; i < jsonArray.length(); i++) {
                    rollNumberPool[i] = jsonArray.optString(i);
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }
        } else {
            Log.i(TAG, "Intent extra number pool is not found");
        }
    }

    @Override
    public void onPause()
    {
        super.onPause();
        if (mOpenCvCameraView != null)
            mOpenCvCameraView.disableView();
    }

    @Override
    public void onResume()
    {
        super.onResume();
        if (!OpenCVLoader.initDebug()) {
            Log.d(TAG, "Internal OpenCV library not found. Using OpenCV Manager for initialization");
            OpenCVLoader.initAsync(OpenCVLoader.OPENCV_VERSION, this, mLoaderCallback);
        } else {
            Log.d(TAG, "OpenCV library found inside package. Using it!");
            mLoaderCallback.onManagerConnected(LoaderCallbackInterface.SUCCESS);

            /**
             * Now load the classifier
             */
            try {
                hwClassifier    = new HWClassifier(UPPATScannerActivity.this, new PredictionListener() {
                    @Override
                    public void OnPredictionSuccess(int digit, String id) {

                    }

                    @Override
                    public void OnPredictionMapSuccess(DigitModel digitMap, String id) {
                        mTotalClassifiedCount++;
                        handleDigitsPredictions(digitMap, id);
                        if (mIsClassifierRequestSubmitted && mTotalClassifiedCount >= mPredictedDigits.size()) {
                            mIsScanningComplete     = true;
                        }

                        if (mIsScanningComplete) {
                            Log.d(TAG, "Scaning completed, classification count " + mTotalClassifiedCount);
                            processScanningCompleted();
                        }
                    }

                    @Override
                    public void OnPredictionFailed(String error) {
                        Log.e(TAG, "Model prediction failed");
                        isHWClassiferAvailable  = false;
                    }

                    @Override
                    public void OnModelLoadStatus(String message) {
                        Log.d(TAG, "Model load status: " + message);
                        isHWClassiferAvailable  = true;
                    }
                });

                hwClassifier.initialize();

            } catch (IOException e) {
                Log.e(TAG, "Failed to load HWClassifier", e);
            }
        }
    }

    public void onDestroy() {
        super.onDestroy();
        if (mOpenCvCameraView != null)
            mOpenCvCameraView.disableView();
    }

    @Override
    public List<? extends CameraBridgeViewBase> getCameraViewList() {
        return null;
    }

    public void onCameraViewStarted(int width, int height) {
        mRgba                           = new Mat(height, width, CvType.CV_8UC4);
        mTableCornerDetection           = new TableCornerCirclesDetection(false);
        mROIs                           = new ExtractROIs(false);
        mDetectShaded                   = new DetectShaded(false);
        blurDetection                   = new BlurDetection(false);
        mTotalClassifiedCount           = 0;
        mIsScanningComplete             = false;
        mScanningResultShared           = false;
        isHWClassiferAvailable          = true;
        isRelevantFrameAvailable        = false;
        mIsClassifierRequestSubmitted   = false;
        mframeCount                     = 0;
        mIgnoreFrameCount               = 0;
    }

    public void onCameraViewStopped() {
        mRgba.release();
    }

    public Mat onCameraFrame(CameraBridgeViewBase.CvCameraViewFrame inputFrame) {
        mRgba               = inputFrame.rgba();
        if (!isRelevantFrameAvailable) {
            processCameraFrame(mRgba, mframeCount);
            mframeCount ++;
        } else {
            showProcessingInformation(mRgba);
        }
        return mRgba;
    }

    private void processCameraFrame(Mat image, long frameCount) {
        Mat tableMat                = mTableCornerDetection.processMat(image);
        mStartTime                  = SystemClock.uptimeMillis();

        if (tableMat != null && isHWClassiferAvailable) {
            if (mIgnoreFrameCount < START_PROCESSING_COUNT) {
                mIgnoreFrameCount ++;
                return;
            }

            Log.d(TAG, "processCameraFrame: blurDetection before:: "+blurDetection.detectBlur(tableMat));
            if(blurDetection.detectBlur(tableMat)) {
                Log.d(TAG, "processCameraFrame: blurDetection after:: "+blurDetection.detectBlur(tableMat));
                return;
            }

            isRelevantFrameAvailable        = true;
            mIsScanningComplete             = false;
            mIsClassifierRequestSubmitted   = false;

            JSONArray rois              = getROIs();
            Log.d(TAG, "Received Table image, extracting: " + rois.length() + " ROIs:");

            mStartPredictTime       = SystemClock.uptimeMillis();
            MediaActionSound sound  = new MediaActionSound();
            sound.play(MediaActionSound.FOCUS_COMPLETE);

            try {
                for (int i = 0; i < rois.length(); i++) {
                    JSONObject roi  = rois.getJSONObject(i);

                    if (roi.getString("method").equals("classify")) {
                        StringBuilder sb    = new StringBuilder().append(roi.getInt("row")).append("_").append(roi.getInt("col"));
                        mPredictedDigits.put(sb.toString(), "0");

                        Mat digitROI        = mDetectShaded.getROIMat(tableMat, roi.getInt("top"), roi.getInt("left"), roi.getInt("bottom"), roi.getInt("right"));
                        if(hwClassifier != null) {
                            Log.d(TAG, "Requesting prediction for: " + sb.toString());
                            mPredictionMat.put(sb.toString(), digitROI);
                            hwClassifier.classifyMat(digitROI, sb.toString());
                        }
                    }
                }
                mIsClassifierRequestSubmitted = true;
                Log.d(TAG, "Detected OMR count: " + mPredictedOMRs.size() + " classifier count: " + mPredictedDigits.size());

            } catch (JSONException e) {
                Log.e(TAG, "got JSON exception");
            }
        }
    }

    private JSONArray getROIs() {
        return mROIs.getUPPatROIs();
    }

    private void handleDigitsPredictions(DigitModel digit, String id) {
        Log.d(TAG, "predicted digit:" + digit.getDigit() + " unique id:" + id);
        if (digit.getDigit() == 10) {
            mPredictedDigits.put(id, "");
        } else {
            mPredictedDigits.put(id, String.valueOf(new Integer(digit.getDigit())));
        }

        //Only Roll Number to store in mPredictedDigitModelArr for PredictionFilter
        String[] spilitedId = id.split("_");
        if(Integer.parseInt(spilitedId[0]) >= 0 && Integer.parseInt(spilitedId[1]) <=3) {
            mPredictedDigitModel.put(String.valueOf(spilitedId[1]), digit);
            if(mPredictedDigitModel.size() == 4) {
                mPredictedDigitModelArr.put(String.valueOf(spilitedId[0]), mPredictedDigitModel);
                mPredictedDigitModel = new HashMap<>();
            }
        }
    }

    private void processScanningCompleted() {
        if (mScanningResultShared){
            return;
        }
        mScanningResultShared   = true;

        MediaActionSound sound  = new MediaActionSound();
        sound.play(MediaActionSound.SHUTTER_CLICK);
        Log.d(TAG, "processScanningCompleted: mPredictedDigitModelArr :: "+mPredictedDigitModelArr.toString());
        JSONObject  response        = getScanResult();
        Log.d(TAG, "Scanning completed OMR count: " + mPredictedOMRs.size() + " classifier count: " + mPredictedDigits.size());

        ReactInstanceManager mReactInstanceManager  = getReactNativeHost().getReactInstanceManager();
        ReactContext reactContext                   = mReactInstanceManager.getCurrentReactContext();
        Intent sendData                             = new Intent(reactContext, UPPATScannerActivity.class);

        sendData.putExtra("fileName", response.toString());
        mReactInstanceManager.onActivityResult(null, 1, 2, sendData);
        finish();
    }

    private JSONObject getScanResult() {
        String studentClass     = mPredictedDigits.get("-2_0");
        JSONObject result       = new JSONObject();


        try {
            Log.d(TAG, "mPredictedDigits: " + new JSONObject(mPredictedDigits).toString());
            Log.d(TAG, "mPredictedOMRs: " + new JSONObject(mPredictedOMRs).toString());

            result.put("class", studentClass);
            String udiseCode = getUdiseCode();
            JSONArray students  = getStudentsAndMarks();

            result.put("students", students);
            result.put("UDISE", udiseCode);
            result.put("predict", new Double((SystemClock.uptimeMillis() - mStartPredictTime)/1000));
            result.put("total", new Double((SystemClock.uptimeMillis() - mStartTime)/1000));

        } catch (JSONException e) {
            return result;
        }

        return result;
    }

    private String getUdiseCode() {
        StringBuffer udise = new StringBuffer();
        int row = -1;
        int cols = 11;

        for(int col=0; col<cols; col++) {
            String key = row+"_"+col;
            String result = mPredictedDigits.get(key);
            udise.append(result);
        }
        return udise.toString();
    }

    private JSONArray getStudentsAndMarks() {
        JSONArray students  = new JSONArray();
        int rows = 5;
        int cols = 14;

        try {
            for(int row=0; row<rows; row++) {
                StringBuffer sb = new StringBuffer();
                JSONArray studentMarks  = new JSONArray();
                for(int col=0; col<cols; col++) {
                    String key = row+"_"+col;
                    String result  = mPredictedDigits.get(key);
                    if(col <=3) {
                        sb.append(result);
                    }
                    if(col > 3) {
                        Mat predictionMat = mPredictionMat.get(key);
                        String base64 = createBase64FromMat(predictionMat);
                        JSONObject mark  = new JSONObject();
                        mark.put("question", col-3);
                        mark.put("mark", result);
                        mark.put("base64", base64);
                        studentMarks.put(mark);
                    }
                }
                JSONObject studentObj  = new JSONObject();
                studentObj.put("srn", sb.toString());
                studentObj.put("marks", studentMarks);

                //Prediction Filter
                Log.d(TAG, "getStudentsAndMarks: mPredictedDigitModelArr.get(row):: "+mPredictedDigitModelArr.get(String.valueOf(row)).toString());
                List<String> predResult = PredictionFilter.applyApproach1(mPredictedDigitModelArr.get(String.valueOf(row)), rollNumberPool);
                Log.i(TAG, "Approach1========>" + predResult);
                //If we have approach1 result then updating the predicted roll number
                if (predResult.size() > 0)
                    studentObj.put("srn", predResult.get(0));

                students.put(studentObj);
            }
        } catch (JSONException e) {
            return students;
        }
        return students;
    }

    private String createBase64FromMat(Mat image) {
        Bitmap resultBitmap = Bitmap.createBitmap(image.cols(), image.rows(), Bitmap.Config.ARGB_8888);
        Utils.matToBitmap(image, resultBitmap);

        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        resultBitmap.compress(Bitmap.CompressFormat.JPEG, 100, byteArrayOutputStream);
        byte[] byteArray    = byteArrayOutputStream.toByteArray();
        String base64       = Base64.encodeToString(byteArray, Base64.DEFAULT);
        return base64;
    }

    private void showProcessingInformation(Mat image) {
        String text     = "Please wait, scanning is in progress !!";
        Point position  = new Point(image.width()/5, image.height() / 2);
        Scalar color    = new Scalar(0, 0, 255);
        int font        = Imgproc.COLOR_BGR2GRAY;
        int scale       = 1;
        int thickness   = 3;
        Imgproc.putText(image, text, position, font, scale, color, thickness);
    }

}
