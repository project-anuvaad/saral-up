import {
    createAppContainer,
    createSwitchNavigator,
} from "react-navigation";

import { createStackNavigator } from 'react-navigation-stack'
import LoginComponent from "../modules/loginScreens/LoginComponent";
import SelectDetailsComponent from "../modules/myScanScreens/SelectDetailsComponent";
import MyScanComponent from '../modules/myScanScreens/MyScanComponent';
import PatScanDetailsComponent from "../modules/myScanScreens/PatScanDetailsComponent";
import ScanHistoryComponent from "../modules/myScanScreens/ScanHistoryComponent";


const AuthStack = createStackNavigator({
    login: {
        screen: LoginComponent
    }   
}, {
    initialRouteName: 'login',
    headerMode: 'none'
})

const MainStack = createStackNavigator(
    { 
        selectDetails: {
            screen: SelectDetailsComponent
        },
        scanHistory: {
            screen: ScanHistoryComponent
        },
        myScan: {
            screen: MyScanComponent
        },
        patScanDetails: {
            screen: PatScanDetailsComponent
        }
    },
    {
        initialRouteName: 'selectDetails',
        headerMode: 'none'
    }
)

const AppNavigation = createSwitchNavigator(
    {
        auth: AuthStack,
        mainMenu: MainStack,
    },
    {
        initialRouteName: 'auth',
    }
);

export default (AppContainer = createAppContainer(AppNavigation));
