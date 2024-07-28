import './ApprovedCabinet.css'; 
import React, { useEffect, useState } from "react";
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

function ApprovedCabinet() {
    useEffect(()=> {
        const fetchPending= async() => {
          var table= document.getElementById('pendingApprovalTable');
          const pendingDocRef=  await doc(db,'cabinets','pending');
          const pendingDocSnap= await getDoc(pendingDocRef);
          if(pendingDocSnap.exists()){
            var data= pendingDocSnap.data();
            var emails= data.emails;
            console.log(emails);
            for(var i=0; i<emails.length; i++){
                const userDocRef= await doc(db,'users',emails[i]);
                const userDocSnap= await getDoc(userDocRef);
                if(userDocSnap.exists()){
                    var userData= userDocSnap.data();
                    var name= '<td>' + userData.firstName + ' ' + userData.lastName + '</td>';
                    var cabinet= '<td>' + userData.cabinet + '</td>'; 
                    var position= '<td>' + userData.position + '</td>';
                    var dropDown= '<td>dropdown</td>';
                    var submit= '<td>submit</td>';
                    table += '<tr>'+ name+cabinet+position+dropDown+submit+ '</tr>';
                }
            }
            document.getElementById('pendingApprovalTable').innerHTML=table;

          };


        };
        fetchPending();
    },[]);

    return (
        <div id='approvedCabinetContainer'className='attendanceForm'>
        <h3> Pending E-board Approval </h3>
        <table id='pendingApprovalTable'> 
            <tr>
                <th> Name </th>
                <th> Cabinet </th>
                <th> Position </th>
                <th> Status </th>
                <th> Submit </th>
            </tr>

        </table>
        </div>
    )
}

export default ApprovedCabinet;