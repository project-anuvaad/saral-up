package com.up_saraldata.prediction;

import android.util.Log;

import com.google.common.collect.Lists;
import com.up_saraldata.hwmodel.DigitModel;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class PredictionFilter {
    private static final String  TAG                    = "UP_Saral::Prediction";
    private static List<String> approach1PredictionResult = new ArrayList<>();

    public static List<String> applyApproach1(HashMap<String, DigitModel> digitModelHashMap, String[] numbersPool) {
        Log.d(TAG, "applyApproach1: digitModelHashMap:: "+digitModelHashMap);
        StringBuilder searchPattern = new StringBuilder();
        String[] digitPlaceMask = new String[4];
        HashMap<Character, Object> digitSpread = getNumberDigitsSpread(numbersPool);
        Log.i(TAG, "DigitSpread:" + digitSpread);
        for (Map.Entry<Character, Object> map : digitSpread.entrySet()) {
            Character key = map.getKey();
            List<Character> spread = (List<Character>) map.getValue();
            if (spread.size() == 1) {
                digitPlaceMask[Integer.parseInt(key.toString()) - 1] = spread.get(0).toString();
                searchPattern.append(spread.get(0));
            } else {
                searchPattern.append("@");
            }
        }
        List<String> predictionResult = analyzePredictedResults(digitModelHashMap, numbersPool, new DigitMaskObject(searchPattern.toString(), digitPlaceMask));
        Log.d(TAG, "applyApproach1: "+predictionResult);
        return approach1PredictionResult;
    }

    static class DigitMaskObject {
        String searchPattern;
        String[] digitMask;

        public DigitMaskObject(String searchPattern, String[] digitMask) {
            this.searchPattern = searchPattern;
            this.digitMask = digitMask;
        }

        public String getSearchPattern() {
            return searchPattern;
        }

        public String[] getDigitMask() {
            return digitMask;
        }
    }

    private static HashMap<Character, Object> getNumberDigitsSpread(String[] roll_codes) {
        Set<Character> digit_1 = new HashSet<>();
        Set<Character> digit_2 = new HashSet<>();
        Set<Character> digit_3 = new HashSet<>();
        Set<Character> digit_4 = new HashSet<>();
        for (String roll_number : roll_codes) {
            digit_1.add(roll_number.charAt(0));
            digit_2.add(roll_number.charAt(1));
            digit_3.add(roll_number.charAt(2));
            digit_4.add(roll_number.charAt(3));
        }
        HashMap<Character, Object> resultMap = new HashMap<>();
        resultMap.put('1', Lists.newArrayList(digit_1));
        resultMap.put('2', Lists.newArrayList(digit_2));
        resultMap.put('3', Lists.newArrayList(digit_3));
        resultMap.put('4', Lists.newArrayList(digit_4));
        return resultMap;
    }

    private static List<String> analyzePredictedResults(HashMap<String, DigitModel> digitModelHashMap, String[] numbersPool, DigitMaskObject digitMaskMode) {
        DigitMaskObject digitMaskObject = getDigitWithHighestScoreWithIgnorePlaces(digitModelHashMap, digitMaskMode.getDigitMask());
        List<String> filteredNumbers = new ArrayList<>();
        for (String number : numbersPool) {
            if (compareNumberWithPattern(number, digitMaskObject.getSearchPattern())) {
                filteredNumbers.add(number);
            }
        }
        Log.i(TAG, "Filtered:" + filteredNumbers);
        if (filteredNumbers.size() > 1) {
            analyzePredictedResults(digitModelHashMap, numbersPool, digitMaskObject);
        } else {
            Log.i(TAG, "Final_Pattern" + digitMaskObject.getSearchPattern());
            Log.i(TAG, "Approach1_Result" + filteredNumbers.toString());
            approach1PredictionResult.clear();
            approach1PredictionResult.addAll(filteredNumbers);
            Log.d(TAG, "analyzePredictedResults: "+approach1PredictionResult.toString());
        }
        Log.d(TAG, "analyzePredictedResults1: "+approach1PredictionResult.toString());
        return approach1PredictionResult;
    }

    private static DigitMaskObject getDigitWithHighestScoreWithIgnorePlaces(HashMap<String, DigitModel> digitModelHashMap, String[] digitPlaceMask) {
        double maxScore = 0;
        int scoreIndex = 0;
        int digitValue = 0;
        Log.i(TAG, "DigitMap:" + digitModelHashMap);
        for (int i = 0; i < digitModelHashMap.entrySet().size(); i++) {
            if (digitPlaceMask[i] == null) {
                DigitModel digitModel = digitModelHashMap.get(String.valueOf(i));
                if (digitModel != null && digitModel.getConfidence() > maxScore) {
                    maxScore = digitModel.getConfidence();
                    scoreIndex = i;
                    digitValue = digitModel.getDigit();
                }
            }
        }
        digitPlaceMask[scoreIndex] = String.valueOf(digitValue);
        /*Log.i(TAG,"MaxScore:"+maxScore);
        Log.i(TAG,"scoreIndex:"+scoreIndex);
        Log.i(TAG,"digitValue:"+digitValue);
        Log.i(TAG,"digitPlaceMask===>:"+Arrays.toString(digitPlaceMask));
*/
        StringBuilder searchPattern = new StringBuilder();
        for (int i = 0; i < digitModelHashMap.entrySet().size(); i++) {
            if (digitPlaceMask[i] != null) {
                searchPattern.append(digitPlaceMask[i]);
            } else {
                searchPattern.append("@");
            }
        }
        Log.i(TAG, "ResultPattern===>:" + searchPattern);
        return new DigitMaskObject(searchPattern.toString(), digitPlaceMask);
    }

    private static boolean compareNumberWithPattern(String number, String pattern) {
        String receivedNumber = number.trim();
        List<Boolean> result = new ArrayList<>();
        //Log.i(TAG,"ReceivedNumber:"+receivedNumber);
        //Log.i(TAG,"ReceivedPatten:"+pattern);
        for (int i = 0; i < receivedNumber.length(); i++) {
            if (pattern.charAt(i) == '@') {
                result.add(true);
            } else {
                if (pattern.charAt(i) == receivedNumber.charAt(i)) {
                    result.add(true);
                } else {
                    result.add(false);
                }
            }
        }
        return !result.contains(false);
    }
}
